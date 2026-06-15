import {
  Component, ChangeDetectionStrategy, ChangeDetectorRef,
  ElementRef, ViewChild, AfterViewChecked, HostListener, OnInit,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  loading?: boolean;
}

const FAB_POS_KEY   = 'chat_fab_pos';
const FAB_SIZE      = 54;
const PANEL_W_MAX   = 340;
const PANEL_H_APPROX = 480;
const PANEL_GAP     = 10;
const EDGE_MARGIN   = 10;

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatbotComponent implements OnInit, AfterViewChecked {
  @ViewChild('msgContainer') msgContainer!: ElementRef<HTMLElement>;

  open       = false;
  input      = '';
  sending    = false;
  isDragging = false;

  private shouldScroll = false;

  // Drag position – null = use CSS default (bottom-right)
  fabLeft: number | null = null;
  fabTop:  number | null = null;

  private dragOffsetX  = 0;
  private dragOffsetY  = 0;
  private startClientX = 0;
  private startClientY = 0;
  private hasMoved     = false;
  private readonly DRAG_THRESHOLD = 6;

  messages: ChatMessage[] = [
    {
      role: 'bot',
      text: "Bonjour ! ⚽ Je suis l'assistant du Tournoi Étoile Universelle 2026. Posez-moi vos questions sur les matchs, les équipes, le programme...",
    },
  ];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    try {
      const saved = localStorage.getItem(FAB_POS_KEY);
      if (saved) {
        const { left, top } = JSON.parse(saved);
        // Re-clamp in case the screen size changed
        this.fabLeft = Math.max(0, Math.min(window.innerWidth  - FAB_SIZE, left));
        this.fabTop  = Math.max(0, Math.min(window.innerHeight - FAB_SIZE, top));
      }
    } catch {}
  }

  // ── Panel position when FAB has been dragged ───────────────────────────────

  get panelStyle(): Record<string, string> {
    if (this.fabLeft === null || this.fabTop === null) return {};

    const pw = Math.min(PANEL_W_MAX, window.innerWidth - 20);

    // Vertical: open above FAB when it's in the bottom half, else below
    let panelTop: number;
    if (this.fabTop + FAB_SIZE / 2 > window.innerHeight / 2) {
      panelTop = Math.max(EDGE_MARGIN, this.fabTop - PANEL_H_APPROX - PANEL_GAP);
    } else {
      panelTop = Math.min(
        window.innerHeight - PANEL_H_APPROX - EDGE_MARGIN,
        this.fabTop + FAB_SIZE + PANEL_GAP,
      );
    }

    // Horizontal: align panel edge to FAB, keep within viewport
    let panelLeft: number;
    if (this.fabLeft + FAB_SIZE / 2 > window.innerWidth / 2) {
      // FAB on right → panel right-aligns with FAB right edge
      panelLeft = Math.max(EDGE_MARGIN, this.fabLeft + FAB_SIZE - pw);
    } else {
      // FAB on left → panel left-aligns with FAB left edge
      panelLeft = Math.min(window.innerWidth - pw - EDGE_MARGIN, this.fabLeft);
    }

    return {
      left:   `${panelLeft}px`,
      top:    `${panelTop}px`,
      right:  'auto',
      bottom: 'auto',
      width:  `${pw}px`,
    };
  }

  // ── Drag handlers ──────────────────────────────────────────────────────────

  onFabPointerDown(event: PointerEvent): void {
    this.hasMoved     = false;
    this.startClientX = event.clientX;
    this.startClientY = event.clientY;

    const fabEl = event.currentTarget as HTMLElement;
    const rect  = fabEl.getBoundingClientRect();

    this.dragOffsetX = event.clientX - rect.left;
    this.dragOffsetY = event.clientY - rect.top;

    // Snap from CSS positioning to inline pixels (no visual jump)
    this.fabLeft = rect.left;
    this.fabTop  = rect.top;

    this.isDragging = true;
    fabEl.setPointerCapture(event.pointerId);
    event.preventDefault();
    this.cdr.markForCheck();
  }

  onFabPointerMove(event: PointerEvent): void {
    if (!this.isDragging) return;

    const dx = event.clientX - this.startClientX;
    const dy = event.clientY - this.startClientY;
    if (Math.sqrt(dx * dx + dy * dy) > this.DRAG_THRESHOLD) this.hasMoved = true;

    this.fabLeft = Math.max(0, Math.min(window.innerWidth  - FAB_SIZE, event.clientX - this.dragOffsetX));
    this.fabTop  = Math.max(0, Math.min(window.innerHeight - FAB_SIZE, event.clientY - this.dragOffsetY));

    this.cdr.markForCheck();
  }

  onFabPointerUp(_event: PointerEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;

    if (!this.hasMoved) {
      this.toggleChat();
    } else {
      try {
        localStorage.setItem(FAB_POS_KEY, JSON.stringify({ left: this.fabLeft, top: this.fabTop }));
      } catch {}
    }
    this.cdr.markForCheck();
  }

  // ── Existing logic ─────────────────────────────────────────────────────────

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.open) this.closeChat();
  }

  toggleChat(): void {
    this.open = !this.open;
    if (this.open) this.shouldScroll = true;
    this.cdr.markForCheck();
  }

  closeChat(): void {
    this.open = false;
    this.cdr.markForCheck();
  }

  sendMessage(): void {
    const text = this.input.trim();
    if (!text || this.sending) return;

    this.messages.push({ role: 'user', text });
    this.input   = '';
    this.sending = true;
    this.shouldScroll = true;

    const placeholder: ChatMessage = { role: 'bot', text: '', loading: true };
    this.messages.push(placeholder);
    this.cdr.markForCheck();

    const history = this.messages
      .filter(m => !m.loading && m.text)
      .slice(-8, -1)
      .map(m => ({ role: m.role === 'user' ? 'user' : 'model', text: m.text }));

    this.http
      .post<{ reply?: string; error?: string }>(
        `${environment.apiUrl}/api/chat`,
        { message: text, history },
      )
      .subscribe({
        next: res => {
          const idx = this.messages.indexOf(placeholder);
          if (idx >= 0) {
            this.messages[idx] = {
              role: 'bot',
              text: res.reply || "Désolé, je n'ai pas pu répondre.",
            };
          }
          this.sending = false;
          this.shouldScroll = true;
          this.cdr.markForCheck();
        },
        error: err => {
          const idx = this.messages.indexOf(placeholder);
          if (idx >= 0) {
            this.messages[idx] = {
              role: 'bot',
              text: err?.error?.error || 'Service temporairement indisponible. Réessayez dans quelques instants.',
            };
          }
          this.sending = false;
          this.shouldScroll = true;
          this.cdr.markForCheck();
        },
      });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    try {
      const el = this.msgContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }
}
