import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from './public.decorator';

type AuthenticatedRequest = {
  headers: Record<string, string | string[] | undefined>;
  user?: unknown;
};

/**
 * Global bearer-token guard. Registered with APP_GUARD in AuthModule so every
 * controller is protected by default; routes annotated with @Public() are the
 * only exceptions.
 *
 * This exists because the API previously had no authorisation at all: every
 * endpoint answered unauthenticated requests, so hiding the frontend routes was
 * no protection — the data could simply be fetched with curl.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const [scheme, token] = (Array.isArray(header) ? header[0] : header ?? '').trim().split(/\s+/);

    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      request.user = await this.jwt.verifyAsync(token);
      return true;
    } catch {
      // Expired and tampered tokens are both reported the same way on purpose;
      // the client only needs to know it should sign in again.
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
