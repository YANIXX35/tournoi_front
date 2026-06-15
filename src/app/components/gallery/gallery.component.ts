import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TournamentService } from '../../services/tournament.service';
import { GalleryPhoto } from '../../models/match.model';

@Component({
  selector: 'app-gallery',
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GalleryComponent implements OnInit {
  photos: GalleryPhoto[] = [];
  loading = true;
  selectedPhoto: GalleryPhoto | null = null;
  page = 1;
  readonly pageSize = 12;

  get paginatedPhotos(): GalleryPhoto[] {
    const start = (this.page - 1) * this.pageSize;
    return this.photos.slice(start, start + this.pageSize);
  }

  constructor(private tournamentService: TournamentService, private cdr: ChangeDetectorRef, private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.tournamentService.getGallery().subscribe({
      next: photos => { this.photos = photos; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); },
    });
  }

  open(p: GalleryPhoto): void { this.selectedPhoto = p; }
  close(): void { this.selectedPhoto = null; }
  stopPropagation(e: Event): void { e.stopPropagation(); }
  onPageChange(p: number): void { this.page = p; this.cdr.markForCheck(); }
  trackByPhotoId(_: number, p: GalleryPhoto): number { return p.id; }

  isVideo(p: GalleryPhoto): boolean { return p.media_type === 'video'; }

  getYoutubeId(url: string): string | null {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  getYoutubeThumbnail(url: string): string {
    const id = this.getYoutubeId(url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
  }

  getYoutubeEmbed(url: string): string {
    const id = this.getYoutubeId(url);
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : url;
  }

  getSafeEmbedUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.getYoutubeEmbed(url));
  }
}
