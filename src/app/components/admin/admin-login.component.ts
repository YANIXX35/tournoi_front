import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-login',
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.scss'],
  standalone: false,
})
export class AdminLoginComponent {
  username = '';
  password = '';
  loading = false;
  error = '';

  constructor(
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}

  login(): void {
    if (!this.username || !this.password) return;
    this.loading = true;
    this.error = '';

    this.auth.login(this.username, this.password).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.router.navigate(['/admin/dashboard']);
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.error = err.error?.error || 'Identifiants incorrects';
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }
}
