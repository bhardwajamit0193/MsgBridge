export async function POST() {
  const cookieHeader = `msgbridge_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookieHeader,
    },
  });
}

export async function GET() {
  const cookieHeader = `msgbridge_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/login',
      'Set-Cookie': cookieHeader,
    },
  });
}
