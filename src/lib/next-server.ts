/**
 * next/server 的 Astro 垫片。
 * 原项目的 API route 用到 NextResponse.json / NextRequest，
 * 这里给出最小等价实现，方便以后把 app/api/* 迁成 src/pages/api/*.ts。
 */

export class NextResponse extends Response {
  static json(body: unknown, init?: ResponseInit) {
    const headers = new Headers(init?.headers);
    headers.set('content-type', 'application/json; charset=utf-8');
    return new NextResponse(JSON.stringify(body), { ...init, headers });
  }
}

export class NextRequest extends Request {
  get nextUrl() {
    return new URL(this.url);
  }
}
