import { Metadata } from 'next';
import SettingsClientPage from './settings-client-page';

export const metadata: Metadata = {
  title: 'Settings | Open for Product',
};

export default function SettingsPage() {
  return <SettingsClientPage />;
}
