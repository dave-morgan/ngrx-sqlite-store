import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@store';
import { notesFeature } from '@impl';

import { NotesActions } from '../state/actions';
import { selectAttachmentSummary, selectNoteStats } from '../state/selectors';

/** Exercises non-entity nested data: arrays in objects in arrays, reorders, and a >1 MB blob. */
@Component({
  selector: 'app-notes-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <div class="page-head">
        <h1>Notes</h1>
        @if (stats(); as s) {
          <span class="muted" data-testid="note-stats">
            {{ s.folders }} folders · {{ s.notes }} notes · {{ s.checked }}/{{ s.items }} checked
          </span>
        }
      </div>

      <div class="card attachment" data-testid="attachment">
        <div>
          <h2>Attachment</h2>
          <p class="muted">Large scalars are split into chunk rows (ADR-0008).</p>
        </div>
        <div class="sizes">
          @for (kb of sizes; track kb) {
            <button class="btn" type="button" (click)="setAttachment(kb)" [attr.data-testid]="'attach-' + kb">
              {{ kb >= 1024 ? (kb / 1024) + ' MB' : kb + ' KB' }}
            </button>
          }
          <button class="btn ghost" type="button" (click)="clearAttachment()" data-testid="attach-clear">Clear</button>
        </div>
        <p class="mono" data-testid="attachment-summary">
          @if (attachment(); as a) { {{ a.name }} · {{ a.length }} chars · {{ a.head }}… } @else { none }
        </p>
      </div>

      <div class="folders">
        @for (folder of folders(); track folder.id) {
          <section class="card folder" [attr.data-testid]="'folder-' + folder.id">
            <header>
              <h2>{{ folder.name }}</h2>
              <button class="btn ghost" type="button" (click)="addNote(folder.id)"
                      [attr.data-testid]="'add-note-' + folder.id">+ Note</button>
            </header>
            @for (note of folder.notes; track note.id; let i = $index, last = $last) {
              <article class="note" [attr.data-testid]="'note-' + note.id">
                <div class="note-head">
                  <strong>{{ note.title }}</strong>
                  <span class="actions">
                    <button class="btn ghost" type="button" [disabled]="i === 0" (click)="move(folder.id, i, i - 1)"
                            aria-label="Move up" [attr.data-testid]="'up-' + note.id">↑</button>
                    <button class="btn ghost" type="button" [disabled]="last" (click)="move(folder.id, i, i + 1)"
                            aria-label="Move down" [attr.data-testid]="'down-' + note.id">↓</button>
                    <button class="btn ghost danger" type="button" (click)="remove(folder.id, note.id)"
                            aria-label="Delete note" [attr.data-testid]="'remove-note-' + note.id">✕</button>
                  </span>
                </div>
                <textarea class="field" rows="2" [value]="note.body" aria-label="Note body"
                          (change)="setBody(folder.id, note.id, $any($event.target).value)"
                          [attr.data-testid]="'body-' + note.id"></textarea>
                <ul class="checklist">
                  @for (item of note.checklist; track $index; let ci = $index) {
                    <li>
                      <label>
                        <input type="checkbox" [checked]="item.done" (change)="toggleItem(folder.id, note.id, ci)"
                               [attr.data-testid]="'check-' + note.id + '-' + ci" />
                        <span [class.done]="item.done">{{ item.text }}</span>
                      </label>
                    </li>
                  }
                </ul>
              </article>
            } @empty {
              <p class="muted">Empty folder.</p>
            }
          </section>
        }
      </div>
    </section>
  `,
  styles: `
    .attachment { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); padding: var(--space-4); }
    .attachment > div:first-child { flex: 1 1 220px; }
    .attachment p { margin: 2px 0 0; }
    .attachment .mono { flex-basis: 100%; overflow-wrap: anywhere; }
    .sizes { display: flex; gap: var(--space-2); flex-wrap: wrap; }
    .folders { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
    .folder { display: grid; gap: var(--space-2); align-content: start; padding: var(--space-3); }
    .folder header, .note-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); }
    .note { display: grid; gap: var(--space-2); padding: var(--space-3); border-radius: var(--radius-sm); background: var(--surface-2); }
    .actions { display: flex; }
    .actions .btn { height: 26px; padding: 0 6px; }
    .checklist { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; font-size: 13px; }
    .checklist label { display: flex; align-items: center; gap: var(--space-2); cursor: pointer; }
    .done { color: var(--muted); text-decoration: line-through; }
  `,
})
export class NotesPage {
  private readonly store = inject(Store);

  protected readonly sizes = [64, 512, 1536, 3072];
  protected readonly folders = this.store.selectSignal(notesFeature.selectFolders);
  protected readonly stats = this.store.selectSignal(selectNoteStats);
  protected readonly attachment = this.store.selectSignal(selectAttachmentSummary);

  protected addNote(folderId: string): void {
    this.store.dispatch(NotesActions.noteAdded({ folderId, title: 'Untitled' }));
  }
  protected move(folderId: string, from: number, to: number): void {
    this.store.dispatch(NotesActions.noteMoved({ folderId, from, to }));
  }
  protected remove(folderId: string, noteId: string): void {
    this.store.dispatch(NotesActions.noteRemoved({ folderId, noteId }));
  }
  protected setBody(folderId: string, noteId: string, body: string): void {
    this.store.dispatch(NotesActions.noteBodyChanged({ folderId, noteId, body }));
  }
  protected toggleItem(folderId: string, noteId: string, index: number): void {
    this.store.dispatch(NotesActions.checklistItemToggled({ folderId, noteId, index }));
  }
  protected setAttachment(sizeKb: number): void {
    this.store.dispatch(NotesActions.attachmentSet({ sizeKb }));
  }
  protected clearAttachment(): void {
    this.store.dispatch(NotesActions.attachmentCleared());
  }
}
