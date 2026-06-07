import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { TournamentService } from '../../services/tournament.service';
import { GalleryPhoto } from '../../models/match.model';

@Component({
  selector: 'app-gallery',
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.scss'],
  standalone: false,
})
export class GalleryComponent implements OnInit {
  photos: GalleryPhoto[] = [];
  loading = true;
  selectedPhoto: GalleryPhoto | null = null;

  constructor(private tournamentService: TournamentService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.tournamentService.getGallery().subscribe({
      next: photos => { this.photos = photos; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); },
    });
  }

  open(p: GalleryPhoto): void { this.selectedPhoto = p; }
  close(): void { this.selectedPhoto = null; }
}
