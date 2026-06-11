import { Injectable } from '@angular/core';
import {
  HttpInterceptor, HttpRequest, HttpHandler,
  HttpEvent, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3000;

@Injectable()
export class OverloadInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return this._attempt(req, next, 0);
  }

  private _attempt(req: HttpRequest<any>, next: HttpHandler, attempt: number): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 503 && attempt < MAX_RETRIES) {
          // Wait then retry silently — the user sees nothing
          return timer(RETRY_DELAY_MS).pipe(
            switchMap(() => this._attempt(req, next, attempt + 1))
          );
        }
        return throwError(() => err);
      })
    );
  }
}
