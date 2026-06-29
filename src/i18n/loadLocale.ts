import { mergeLocales } from "./mergeLocales";

import trCore from "./locales/tr.json";
import enCore from "./locales/en.json";
import deCore from "./locales/de.json";
import frCore from "./locales/fr.json";
import arCore from "./locales/ar.json";

import trAuth from "./locales/tr/auth.json";
import trLegal from "./locales/tr/legal.json";
import trCars from "./locales/tr/cars.json";
import trPaymentExt from "./locales/tr/payment-ext.json";
import trFooter from "./locales/tr/footer.json";
import trComponents from "./locales/tr/components.json";
import trOwner from "./locales/tr/owner.json";
import trSupport from "./locales/tr/support.json";
import trAdmin from "./locales/tr/admin.json";

import enAuth from "./locales/en/auth.json";
import enLegal from "./locales/en/legal.json";
import enCars from "./locales/en/cars.json";
import enPaymentExt from "./locales/en/payment-ext.json";
import enFooter from "./locales/en/footer.json";
import enComponents from "./locales/en/components.json";
import enOwner from "./locales/en/owner.json";
import enSupport from "./locales/en/support.json";
import enAdmin from "./locales/en/admin.json";

import deAuth from "./locales/de/auth.json";
import deLegal from "./locales/de/legal.json";
import deCars from "./locales/de/cars.json";
import dePaymentExt from "./locales/de/payment-ext.json";
import deFooter from "./locales/de/footer.json";
import deComponents from "./locales/de/components.json";
import deOwner from "./locales/de/owner.json";
import deSupport from "./locales/de/support.json";
import deAdmin from "./locales/de/admin.json";

import frAuth from "./locales/fr/auth.json";
import frLegal from "./locales/fr/legal.json";
import frCars from "./locales/fr/cars.json";
import frPaymentExt from "./locales/fr/payment-ext.json";
import frFooter from "./locales/fr/footer.json";
import frComponents from "./locales/fr/components.json";
import frOwner from "./locales/fr/owner.json";
import frSupport from "./locales/fr/support.json";
import frAdmin from "./locales/fr/admin.json";

import arAuth from "./locales/ar/auth.json";
import arLegal from "./locales/ar/legal.json";
import arCars from "./locales/ar/cars.json";
import arPaymentExt from "./locales/ar/payment-ext.json";
import arFooter from "./locales/ar/footer.json";
import arComponents from "./locales/ar/components.json";
import arOwner from "./locales/ar/owner.json";
import arSupport from "./locales/ar/support.json";
import arAdmin from "./locales/ar/admin.json";

function buildLocale(core: Record<string, unknown>, ...extras: Record<string, unknown>[]) {
  return mergeLocales(core, ...extras);
}

const trExtras = [trAuth, trLegal, trCars, trPaymentExt, trFooter, trComponents, trOwner, trSupport, trAdmin];
const enExtras = [enAuth, enLegal, enCars, enPaymentExt, enFooter, enComponents, enOwner, enSupport, enAdmin];
const deExtras = [deAuth, deLegal, deCars, dePaymentExt, deFooter, deComponents, deOwner, deSupport, deAdmin];
const frExtras = [frAuth, frLegal, frCars, frPaymentExt, frFooter, frComponents, frOwner, frSupport, frAdmin];
const arExtras = [arAuth, arLegal, arCars, arPaymentExt, arFooter, arComponents, arOwner, arSupport, arAdmin];

export const tr = buildLocale(trCore as Record<string, unknown>, ...(trExtras as Record<string, unknown>[]));
export const en = buildLocale(enCore as Record<string, unknown>, ...(enExtras as Record<string, unknown>[]));
export const de = buildLocale(deCore as Record<string, unknown>, ...(deExtras as Record<string, unknown>[]));
export const fr = buildLocale(frCore as Record<string, unknown>, ...(frExtras as Record<string, unknown>[]));
export const ar = buildLocale(arCore as Record<string, unknown>, ...(arExtras as Record<string, unknown>[]));
