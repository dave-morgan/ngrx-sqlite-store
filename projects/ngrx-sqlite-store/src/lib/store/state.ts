import { Injectable } from '@angular/core';
import { INIT } from '@ngrx/store';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class State<T = object> extends BehaviorSubject<T> {
  static readonly INIT = INIT;
  constructor() {
    super({} as T);
  }
  ngOnDestroy(): void {
    this.complete();
  }
}
