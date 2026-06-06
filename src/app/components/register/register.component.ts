import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, FormControl } from '@angular/forms';
import { TeamService } from '../../services/team.service';
import { timeout, catchError } from 'rxjs/operators';
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

  private slowTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private fb: FormBuilder, private teamService: TeamService) {
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

  createPlayer(): FormControl {
    return this.fb.control('', Validators.required);
  }

  addPlayer(): void {
    if (this.players.length < 20) this.players.push(this.createPlayer());
  }

  removePlayer(i: number): void {
    if (this.players.length > 1) this.players.removeAt(i);
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
    const players = (this.players.value as string[]).filter(n => n.trim());
    if (players.length === 0) { this.errorMsg = 'Ajoutez au moins un joueur.'; return; }

    this.loading = true;
    this.errorMsg = '';
    this.slowWarning = false;

    // Afficher un avertissement si ça prend plus de 8 secondes (cold start Render)
    this.slowTimer = setTimeout(() => {
      if (this.loading) this.slowWarning = true;
    }, 8000);

    const { name, captain_name, phone } = this.teamForm.value;

    this.teamService.register({ name, captain_name, phone, logo_path: this.logoPath, players })
      .pipe(
        timeout(65000),
        catchError(err => of({ _error: err }))
      )
      .subscribe((res: any) => {
        this.loading = false;
        this.slowWarning = false;
        if (this.slowTimer) { clearTimeout(this.slowTimer); this.slowTimer = null; }

        if (res?._error) {
          this.errorMsg = res._error?.error?.error || 'Erreur lors de l\'inscription. Réessayez dans quelques secondes.';
        } else {
          this.success = true;
        }
      });
  }

  retry(): void {
    this.errorMsg = '';
    this.submit();
  }
}
