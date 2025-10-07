import { type NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
	if (request.nextUrl.pathname.startsWith('/ping')) {
		return new Response('pong', { status: 200 });
	}

	return NextResponse.next();
}

export const config = {
	matcher: ['/ping'],
};
