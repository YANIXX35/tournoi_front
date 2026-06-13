import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { MatchesComponent } from './components/matches/matches.component';
import { ResultsComponent } from './components/results/results.component';
import { TeamsComponent } from './components/teams/teams.component';
import { RegisterComponent } from './components/register/register.component';
import { AdminLoginComponent } from './components/admin/admin-login.component';
import { AdminDashboardComponent } from './components/admin/admin-dashboard.component';
import { ButeursComponent } from './components/buteurs/buteurs.component';
import { TeamDetailComponent } from './components/team-detail/team-detail.component';
import { GalleryComponent } from './components/gallery/gallery.component';
import { YkComponent } from './components/yk/yk.component';
import { BracketComponent } from './components/bracket/bracket.component';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'matchs', component: MatchesComponent },
  { path: 'buteurs', component: ButeursComponent },
  { path: 'resultats', component: ResultsComponent },
  { path: 'equipes', component: TeamsComponent },
  { path: 'equipes/:id', component: TeamDetailComponent },
  { path: 'galerie', component: GalleryComponent },
  { path: 'inscription', component: RegisterComponent },
  { path: 'admin/login', component: AdminLoginComponent },
  { path: 'admin/dashboard', component: AdminDashboardComponent, canActivate: [AuthGuard] },
  { path: 'bracket', component: BracketComponent },
  { path: 'yk', component: YkComponent },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
