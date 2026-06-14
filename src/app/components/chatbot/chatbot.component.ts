import {
  Component, ChangeDetectionStrategy, ChangeDetectorRef,
  ElementRef, ViewChild, AfterViewChecked, HostListener,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  loading?: boolean;
}

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatbotComponent implements AfterViewChecked {
  @ViewChild('msgContainer') msgContainer!: ElementRef<HTMLElement>;

  open = false;
  input = '';
  sending = false;
  private shouldScroll = false;

  messages: ChatMessage[] = [
    {
      role: 'bot',
      text: 'Bonjour ! ⚽ Je suis l\'assistant du Tournoi Étoile Universelle 2026. Posez-moi vos questions sur les matchs, les équipes, le programme...',
    },
  ];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

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
    this.input = '';
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
              text: res.reply || 'Désolé, je n\'ai pas pu répondre.',
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
