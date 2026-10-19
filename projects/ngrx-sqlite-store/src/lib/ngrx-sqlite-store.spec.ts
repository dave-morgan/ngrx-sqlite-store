import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgrxSqliteStore } from './ngrx-sqlite-store';

describe('NgrxSqliteStore', () => {
  let component: NgrxSqliteStore;
  let fixture: ComponentFixture<NgrxSqliteStore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgrxSqliteStore],
    }).compileComponents();

    fixture = TestBed.createComponent(NgrxSqliteStore);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
