import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import RoleGuard from '../components/RoleGuard';

const sections = [
  {
    title: 'Company Profile',
    fields: [
      { label: 'Company name', type: 'text' },
      { label: 'Contact email', type: 'email' },
    ],
  },
  {
    title: 'Invoice Defaults',
    fields: [
      { label: 'Invoice prefix', type: 'text' },
      { label: 'Default tax rate (%)', type: 'number' },
    ],
  },
];

export default function SettingsPage() {
  return (
    <RoleGuard
      allowedRoles={['admin', 'manager']}
      fallback={
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          Access Denied — Admins only
        </div>
      }
    >
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
      <div className="max-w-2xl space-y-6">
        {sections.map((section) => (
          <form key={section.title} onSubmit={(e) => e.preventDefault()}>
            <Card
              title={section.title}
              footer={<Button type="submit">Save</Button>}
            >
              <div className="space-y-4">
                {section.fields.map((field) => (
                  <Input key={field.label} label={field.label} type={field.type} />
                ))}
              </div>
            </Card>
          </form>
        ))}
      </div>
    </div>
    </RoleGuard>
  );
}
