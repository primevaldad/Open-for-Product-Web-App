import { cookies } from 'next/headers';
async function run() {
  const c = await cookies();
  c.set('test', 'value');
  console.log(c.get('test'));
}
