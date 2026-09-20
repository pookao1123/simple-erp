import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';

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
  );
}
