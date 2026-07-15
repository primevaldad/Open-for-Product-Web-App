import { NextResponse } from 'next/server';
console.log(NextResponse.redirect('http://a', { status: 303 } as any).status);
console.log(NextResponse.redirect('http://a', 303).status);
