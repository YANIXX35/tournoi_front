import { Component, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { TeamService } from '../../services/team.service';
import { timeout, finalize, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  standalone: false,
})
export class RegisterComponent implements OnDestroy {
  step = 1;
  teamForm: FormGroup;
  loading = false;
  success = false;
  errorMsg = '';
  slowWarning = false;

  logoPreview: string | null = null;
  logoPath: string | null = null;
  uploadingLogo = false;
  logoUploadWarning = '';

  playerPhotoPreviews: (string | null)[] = [null, null];
  playerPhotoUploading: boolean[] = [false, false];
  playerPhotoPaths: (string | null)[] = [null, null];

  private slowTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private fb: FormBuilder,
    private teamService: TeamService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {
    this.teamForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      captain_name: ['', Validators.required],
      phone: ['', Validators.required],
      players: this.fb.array([this.createPlayer(), this.createPlayer()]),
    });
  }

  ngOnDestroy(): void {
    if (this.slowTimer) clearTimeout(this.slowTimer);
  }

  get players(): FormArray {
    return this.teamForm.get('players') as FormArray;
  }

  playerGroup(i: number): FormGroup {
    return this.players.at(i) as FormGroup;
  }

  createPlayer(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      photo: [null],
    });
  }

  addPlayer(): void {
    if (this.players.length < 20) {
      this.players.push(this.createPlayer());
      this.playerPhotoPreviews.push(null);
      this.playerPhotoUploading.push(false);
      this.playerPhotoPaths.push(null);
    }
  }

  removePlayer(i: number): void {
    if (this.players.length > 1) {
      this.players.removeAt(i);
      this.playerPhotoPreviews.splice(i, 1);
      this.playerPhotoUploading.splice(i, 1);
      this.playerPhotoPaths.splice(i, 1);
    }
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => this.logoPreview = e.target?.result as string;
    reader.readAsDataURL(file);

    this.uploadingLogo = true;
    this.logoUploadWarning = '';

    this.teamService.uploadLogo(file).pipe(
      timeout(30000),
      catchError(() => of(null))
    ).subscribe(res => {
      this.uploadingLogo = false;
      if (res && res.logo_path) {
        this.logoPath = res.logo_path;
      } else {
        this.logoPath = null;
        this.logoUploadWarning = 'Logo non enregistré (serveur lent). Vous pouvez continuer sans.';
      }
    });
  }

  onPlayerPhotoSelected(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.ngZone.run(() => {
        this.playerPhotoPreviews[index] = e.target?.result as string;
        this.cdr.detectChanges();
      });
    };
    reader.readAsDataURL(file);

    this.playerPhotoUploading[index] = true;

    this.teamService.uploadLogo(file).pipe(
      timeout(30000),
      catchError(() => of(null))
    ).subscribe(res => {
      this.ngZone.run(() => {
        this.playerPhotoUploading[index] = false;
        if (res && res.logo_path) {
          this.playerPhotoPaths[index] = res.logo_path;
        } else {
          this.playerPhotoPaths[index] = null;
        }
        this.cdr.detectChanges();
      });
    });
  }

  removePlayerPhoto(i: number): void {
    this.playerPhotoPreviews[i] = null;
    this.playerPhotoPaths[i] = null;
    this.playerGroup(i).get('photo')?.setValue(null);
  }

  nextStep(): void {
    const f = this.teamForm;
    if (f.get('name')?.valid && f.get('captain_name')?.valid && f.get('phone')?.valid) {
      this.step = 2;
    } else {
      f.get('name')?.markAsTouched();
      f.get('captain_name')?.markAsTouched();
      f.get('phone')?.markAsTouched();
    }
  }

  prevStep(): void { this.step = 1; }

  submit(): void {
    if (this.loading) return;

    const players = (this.players.controls as FormGroup[])
      .map((ctrl, i) => ({
        player_name: ((ctrl.get('name')?.value as string) || '').trim(),
        photo_path: this.playerPhotoPaths[i] || null,
      }))
      .filter(p => p.player_name);

    if (players.length === 0) { this.errorMsg = 'Ajoutez au moins un joueur.'; return; }

    this.loading = true;
    this.errorMsg = '';
    this.slowWarning = false;

    this.slowTimer = setTimeout(() => {
      if (this.loading) this.slowWarning = true;
    }, 8000);

    const { name, captain_name, phone } = this.teamForm.value;

    this.teamService
      .register({ name, captain_name, phone, logo_path: this.logoPath, players })
      .pipe(
        timeout(65000),
        finalize(() => {
          this.ngZone.run(() => {
            this.loading = false;
            this.slowWarning = false;
            if (this.slowTimer) {
              clearTimeout(this.slowTimer);
              this.slowTimer = null;
            }
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: (_res) => {
          this.ngZone.run(() => {
            this.success = true;
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            if (err?.name === 'TimeoutError') {
              this.errorMsg = 'Temps de connexion dépassé. Le serveur démarre peut-être. Réessayez.';
            } else {
              const serverMsg = err?.error?.error || err?.error?.message || '';
              this.errorMsg = serverMsg || 'Erreur lors de l\'inscription. Réessayez.';
            }
            this.cdr.detectChanges();
          });
        }
      });
  }

  retry(): void {
    this.errorMsg = '';
    this.submit();
  }
}
