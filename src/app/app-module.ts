import { NgModule, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { OverloadInterceptor } from './interceptors/overload.interceptor';
import { PaginationComponent } from './components/shared/pagination.component';
import { ServiceWorkerModule } from '@angular/service-worker';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { RevealDirective } from './directives/reveal.directive';

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
import { MvpComponent } from './components/mvp/mvp.component';
import { ChatbotComponent } from './components/chatbot/chatbot.component';

@NgModule({
  declarations: [
    App,
    HomeComponent,
    MatchesComponent,
    ResultsComponent,
    TeamsComponent,
    RegisterComponent,
    AdminLoginComponent,
    AdminDashboardComponent,
    ButeursComponent,
    TeamDetailComponent,
    GalleryComponent,
    YkComponent,
    BracketComponent,
    MvpComponent,
    ChatbotComponent,
    RevealDirective,
    PaginationComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: HTTP_INTERCEPTORS, useClass: OverloadInterceptor, multi: true },
  ],
  bootstrap: [App]
})
export class AppModule {}
