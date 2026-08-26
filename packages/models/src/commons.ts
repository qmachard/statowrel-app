// Types only, and `import type` on purpose: this package is bundled into the
// React Native app, which runs on React Native Firebase and has neither of
// these SDKs installed. `import type` is erased by the compiler, so `dist/`
// carries no `require('firebase/firestore')` for Metro to fail on — a plain
// `import` used only in type positions relies on the compiler electing to
// elide it, which is a guarantee nobody should be resting a bundle on.
import type { GeoPoint, QueryDocumentSnapshot, Timestamp } from 'firebase/firestore';
import type {
  GeoPoint as AdminGeoPoint,
  QueryDocumentSnapshot as AdminQueryDocumentSnapshot,
  Timestamp as AdminTimestamp,
} from 'firebase-admin/firestore';

export type UniversalSnapshot<T> = AdminQueryDocumentSnapshot<Partial<T>> | QueryDocumentSnapshot<Partial<T>>

export type UniversalTimestamp = AdminTimestamp | Timestamp;

export type UniversalGeoPoint = AdminGeoPoint | GeoPoint;

export type Identifiable<T, TIdentifiableField extends string = 'id'> = T & Record<TIdentifiableField, string>;

export type NullableValue<T> = T | null | undefined;

// Type récursif pour convertir les champs UniversalTimestamp en string, en conservant les autres types
export type ModelData<T> = {
  [K in keyof T]: TransformField<T[K]>;
};

// Cœur de la transformation
type TransformField<T> =
// Case 1: timestamp direct
  IsTimestamp<T> extends true
    ? string
    // 1b: geopoint direct
    : IsGeoPoint<T> extends true
      ? { latitude: number; longitude: number }
      // Case 2: nullable => on traite récursivement le contenu
      : IsNullable<T> extends true
        ? T extends null | undefined
          ? T
          : T extends infer U | null | undefined
            ? NullableValue<TransformField<NonNullable<U>>>
            : never
        // Case 3: array
        : T extends (infer U)[]
          ? TransformField<U>[]
          // Case 4: object (pur)
          : T extends object
            ? { [K in keyof T]: TransformField<T[K]> }
            // Case 5: primitif
            : T;

// Detecte si T est un timestamp
type IsTimestamp<T> = T extends UniversalTimestamp ? true : false;

type IsGeoPoint<T> = T extends UniversalGeoPoint ? true : false;

// Detecte si T est nullable (null ou undefined ou union avec)
type IsNullable<T> = null extends T ? true : undefined extends T ? true : false;

export function removeMissingFields<T extends object>(data: T): Required<T> {
  return Object.entries(data).reduce<Required<T>>((acc, [ key, value ]) => {
    if (value !== undefined) {
      // @ts-ignore
      acc[key] = value;
    }

    return acc;
  }, {} as Required<T>);
}

export function parseTimestamp(date: UniversalTimestamp | string | null, defaultValue: 'now' | string): string;
export function parseTimestamp(date: UniversalTimestamp | string | null, defaultValue?: null): null;
export function parseTimestamp(date: UniversalTimestamp | string | null, defaultValue: string | null = null): string | null {
  if (typeof date === 'string') {
    return date;
  } else if (date !== null && 'toDate' in (date || {})) {
    return date.toDate().toISOString();
  } else if (defaultValue === 'now') {
    return (new Date()).toISOString();
  } else {
    return defaultValue;
  }
}

export type FirestoreConverter<TData, TFirestoreData> = (
  TimestampClass: typeof AdminTimestamp | typeof Timestamp,
  GeoPointClass: typeof AdminGeoPoint | typeof GeoPoint,
) => {
  toFirestore: (data: TData) => TFirestoreData;
  fromFirestore: (snap: UniversalSnapshot<TFirestoreData>) => TData;
};

export class DefaultTimestamp {
  private date: Date = new Date();

  readonly seconds: number = this.date.getSeconds();
  readonly nanoseconds: number = 0;

  public toDate(): Date {
    return this.date;
  }

  public toMillis(): number {
    return this.date.getTime();
  }

  public isEqual(other: UniversalTimestamp): boolean {
    return other.seconds === this.seconds;
  }

  public toJSON() {
    return {
      seconds: this.seconds,
      nanoseconds: this.nanoseconds,
    };
  }

  public valueOf(): string {
    return this.seconds.toString();
  }
}
