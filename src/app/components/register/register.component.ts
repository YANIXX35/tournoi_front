import { Component, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
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

  dialCodes = [
    { country: "Côte d'Ivoire", code: '+225', flag: '🇨🇮', maxDigits: 10 },
    { country: 'Sénégal',       code: '+221', flag: '🇸🇳', maxDigits: 9  },
    { country: 'Mali',          code: '+223', flag: '🇲🇱', maxDigits: 8  },
    { country: 'Ghana',         code: '+233', flag: '🇬🇭', maxDigits: 10 },
  ];
  selectedDial = this.dialCodes[0];

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
      phone: ['', [Validators.required, this.phoneDigitsValidator.bind(this)]],
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

    this.playerPhotoUploading[index] = true;
    this.cdr.detectChanges();

    this._resizeToBase64(file, 400, 400).then(dataUrl => {
      this.ngZone.run(() => {
        this.playerPhotoPreviews[index] = dataUrl;
        this.playerPhotoPaths[index] = dataUrl;
        this.playerPhotoUploading[index] = false;
        this.cdr.detectChanges();
      });
    }).catch(() => {
      this.ngZone.run(() => {
        this.playerPhotoUploading[index] = false;
        this.playerPhotoPaths[index] = null;
        this.cdr.detectChanges();
      });
    });
  }

  private _resizeToBase64(file: File, maxW: number, maxH: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = ev => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
          const canvas = document.createElement('canvas');
          canvas.width  = Math.round(img.width  * ratio);
          canvas.height = Math.round(img.height * ratio);
          canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
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

  phoneDigitsValidator(control: AbstractControl): ValidationErrors | null {
    const digits = (control.value || '').replace(/\D/g, '');
    if (!digits) return { required: true };
    if (digits.length < 6) return { tooShort: true };
    if (digits.length > this.selectedDial.maxDigits) return { tooLong: true };
    return null;
  }

  onDialChange(code: string): void {
    this.selectedDial = this.dialCodes.find(d => d.code === code) ?? this.dialCodes[0];
    this.teamForm.get('phone')?.updateValueAndValidity();
  }

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

    const { name, captain_name } = this.teamForm.value;
    const localDigits = (this.teamForm.value.phone || '').replace(/\D/g, '');
    const phone = this.selectedDial.code + localDigits;

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
