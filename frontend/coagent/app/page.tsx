import { redirect } from 'next/navigation';

/**
 * Root page - Redirect to v0-style developer interface
 */
export default function Home() {
  redirect('/developer');
}
