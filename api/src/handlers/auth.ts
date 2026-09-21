import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Session, User } from '@supabase/supabase-js';
import { authenticate, getRole } from '../lib/auth';
import { errors, sendJson } from '../lib/error-handler';
import { loginSchema, refreshSchema, signupSchema } from '../lib/schemas';
import { createAuthClient, getAdminClient } from '../lib/supabase-admin';
import { assertMethod, getSegments, parseBody } from '../lib/utils';
import { z } from 'zod';

function formatUser(user: User, role: string) {
  return {
    id: user.id,
    email: user.email,
    name: (user.user_metadata?.name as string | undefined) ?? null,
    role,
    created_at: user.created_at,
  };
}

function formatSession(session: Session | null) {
  if (!session) return null;
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
  };
}

async function signup(req: VercelRequest, res: VercelResponse) {
  const { email, password, name } = parseBody(req, signupSchema);
  const { data, error } = await createAuthClient().auth.signUp({
    email,
    password,
    options: name ? { data: { name } } : undefined,
  });
  if (error) {
    if (/already|registered/i.test(error.message)) throw errors.conflict('Email already registered');
    if (error.status && error.status < 500) throw errors.invalidInput({}, error.message);
    throw errors.internal();
  }
  if (!data.user || data.user.identities?.length === 0) throw errors.conflict('Email already registered');

  const { error: roleErr } = await getAdminClient()
    .from('user_roles')
    .insert({ user_id: data.user.id, role: 'employee' });
  if (roleErr && roleErr.code !== '23505') {
    console.error('user_roles insert failed:', roleErr);
    throw errors.internal();
  }
  sendJson(res, 201, { user: formatUser(data.user, 'employee'), session: formatSession(data.session) });
}

async function login(req: VercelRequest, res: VercelResponse) {
  const { email, password } = parseBody(req, loginSchema);
  const { data, error } = await createAuthClient().auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    throw errors.unauthorized(error?.message ?? 'Invalid email or password');
  }
  const role = await getRole(data.user.id);
  sendJson(res, 200, { user: formatUser(data.user, role), session: formatSession(data.session) });
}

async function logout(req: VercelRequest, res: VercelResponse) {
  const auth = await authenticate(req);
  const { error } = await getAdminClient().auth.admin.signOut(auth.token);
  if (error) {
    console.error('signOut failed:', error);
    throw errors.internal();
  }
  sendJson(res, 200, { message: 'Logged out' });
}

// Refresh token from Authorization header (per spec Finding #8 resolution).
async function refreshToken(req: VercelRequest, res: VercelResponse) {
  const auth = await authenticate(req);
  const { data, error } = await createAuthClient().auth.refreshSession({ refresh_token: auth.token });
  if (error || !data.session) throw errors.unauthorized('Token expired and cannot be refreshed');
  sendJson(res, 200, { session: formatSession(data.session) });
}

async function me(req: VercelRequest, res: VercelResponse) {
  const auth = await authenticate(req);
  const { data } = await getAdminClient()
    .from('users_with_roles')
    .select('*')
    .eq('id', auth.userId)
    .maybeSingle();
  const user = data ?? { ...formatUser(auth.user, auth.isAdmin ? 'admin' : await getRole(auth.userId)) };
  sendJson(res, 200, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name ?? (auth.user.user_metadata?.name as string | undefined) ?? null,
      role: user.role,
      created_at: user.created_at,
    },
  });
}

// Get current user profile (read-only, for Settings display).
async function getUserProfile(req: VercelRequest, res: VercelResponse) {
  const auth = await authenticate(req);
  const { data } = await getAdminClient()
    .from('users_with_roles')
    .select('id, email, name, role, created_at')
    .eq('id', auth.userId)
    .maybeSingle();
  if (!data) throw errors.notFound('User');
  sendJson(res, 200, { user: { id: data.id, email: data.email, name: data.name, role: data.role, created_at: data.created_at } });
}

// Update current user profile (name only — email is identity, cannot change).
async function updateUserProfile(req: VercelRequest, res: VercelResponse) {
  const auth = await authenticate(req);
  const { name } = parseBody(req, z.object({ name: z.string().min(1).max(100).optional() }));
  // Update Supabase user_metadata + return the updated user.
  const { data: updateData, error: updateError } = await getAdminClient().auth.admin.updateUserById(auth.userId, {
    user_metadata: name ? { name } : undefined,
  });
  if (updateError) throw errors.internal();
  const role = await getRole(auth.userId);
  sendJson(res, 200, { user: formatUser(updateData.user, role) });
}

// Change password — validate current password, then set new one.
async function changePassword(req: VercelRequest, res: VercelResponse) {
  const auth = await authenticate(req);
  const { current_password, new_password, confirm_password } = parseBody(req, z.object({
    current_password: z.string().min(1),
    new_password: z.string().min(8).max(100),
    confirm_password: z.string().min(8).max(100),
  }));
  if (new_password !== confirm_password) {
    throw errors.invalidInput({ fieldErrors: { confirm_password: ['Passwords do not match'] } }, 'Passwords do not match');
  }
  // Verify current password by attempting sign-in.
  const { error: signInError } = await createAuthClient().auth.signInWithPassword({ email: auth.user.email!, password: current_password });
  if (signInError) throw errors.unauthorized('Current password is incorrect');

  const { error } = await getAdminClient().auth.admin.updateUserById(auth.userId, { password: new_password });
  if (error) throw errors.internal();
  sendJson(res, 200, { message: 'Password changed successfully' });
}

// Forgot password — send reset email.
async function forgotPassword(req: VercelRequest, res: VercelResponse) {
  const { email } = parseBody(req, z.object({ email: z.string().email() }));
  const { error } = await createAuthClient().auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/reset-password`,
  });
  if (error) {
    if (error.status === 400 || error.message?.toLowerCase().includes('not found')) {
      return sendJson(res, 200, { message: 'If the email is associated with an account, a password reset link has been sent.' });
    }
    throw errors.internal();
  }
  sendJson(res, 200, { message: 'If the email is associated with an account, a password reset link has been sent.' });
}

// Reset password — verify token + set new password.
async function resetPassword(req: VercelRequest, res: VercelResponse) {
  const { token, new_password, confirm_password } = parseBody(req, z.object({
    token: z.string().min(1),
    new_password: z.string().min(8).max(100),
    confirm_password: z.string().min(8).max(100),
  }));
  if (new_password !== confirm_password) {
    throw errors.invalidInput({ fieldErrors: { confirm_password: ['Passwords do not match'] } }, 'Passwords do not match');
  }
  // Verify the recovery token with the anon client (token is single-use).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: otpData, error: otpError } = await createAuthClient().auth.verifyOtp({ type: 'recovery', token } as any);
  if (otpError || !otpData?.session) {
    if (/invalid|expired/i.test(otpError?.message ?? '')) throw errors.invalidInput({}, 'Invalid or expired reset token');
    throw errors.internal();
  }
  // Update the password using the service-role client's auth admin API.
  const adminClient = getAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(otpData.session.user.id, { password: new_password });
  if (error) throw errors.internal();
  sendJson(res, 200, { message: 'Password reset successfully' });
}

// List all users (admin only).
async function listUsers(req: VercelRequest, res: VercelResponse) {
  const auth = await authenticate(req);
  if (!auth.isAdmin) throw errors.forbidden('Admin access required');
  const { data } = await getAdminClient()
    .from('users_with_roles')
    .select('id, email, name, role, created_at')
    .order('created_at', { ascending: false });
  sendJson(res, 200, { users: data ?? [] });
}

export async function handleAuth(req: VercelRequest, res: VercelResponse, url: URL) {
  const [, action, ...extra] = getSegments(url);
  if (extra.length) throw errors.notFound('Endpoint');
  switch (action) {
    case 'signup':
      assertMethod(req, ['POST']);
      return signup(req, res);
    case 'login':
      assertMethod(req, ['POST']);
      return login(req, res);
    case 'logout':
      assertMethod(req, ['POST']);
      return logout(req, res);
    case 'refresh-token':
      assertMethod(req, ['POST']);
      return refreshToken(req, res);
    case 'me':
      if (req.method === 'GET') return getUserProfile(req, res);
      if (req.method === 'PUT') return updateUserProfile(req, res);
      throw errors.notAllowed();
    case 'change-password':
      assertMethod(req, ['POST']);
      return changePassword(req, res);
    case 'forgot-password':
      assertMethod(req, ['POST']);
      return forgotPassword(req, res);
    case 'reset-password':
      assertMethod(req, ['POST']);
      return resetPassword(req, res);
    case 'users':
      assertMethod(req, ['GET']);
      return listUsers(req, res);
    default:
      throw errors.notFound('Endpoint');
  }
}
