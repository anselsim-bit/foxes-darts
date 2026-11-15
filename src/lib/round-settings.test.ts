import { describe, expect, it } from "vitest";
import { phaseRules, validateFinalLegs, validateLiveLegs } from "./dart-rules";
import { validateRoundSettings } from "./round-settings";
const rule = (legsToWin: number, start = 301, doubleOut = false) => ({ legsToWin, start, doubleOut });
const settings = { start_score: 501, double_out: true, game_settings: {version: 1, phases: { pool: rule(3), bracket: rule(2), consolation: rule(4) }, rounds: { "bracket:0": rule(5,501,true), "bracket:1": rule(3), "consolation:0": rule(6,501,true), small_final: rule(1) }} };
describe("règles par étape", () => {
  it("applique trois manches gagnantes en poules", () => expect(phaseRules(settings,"pool")).toMatchObject(rule(3)));
  it("applique le score, la sortie et les cinq manches de la finale", () => expect(phaseRules(settings,"bracket",0)).toMatchObject(rule(5,501,true)));
  it("applique les règles spécifiques des demi-finales", () => expect(phaseRules(settings,"bracket",1)).toMatchObject(rule(3)));
  it("hérite de la phase pour une étape sans exception", () => expect(phaseRules(settings,"bracket",2)).toMatchObject(rule(2)));
  it("résout la finale de consolante indépendamment", () => expect(phaseRules(settings,"consolation",0)).toMatchObject(rule(6,501,true)));
  it("résout la petite finale indépendamment", () => expect(phaseRules(settings,"small_final")).toMatchObject(rule(1)));
  it("préserve les anciennes règles sans configuration", () => { expect(phaseRules({start_score:501,double_out:true},"pool").legsToWin).toBe(1); expect(phaseRules({start_score:501,double_out:true},"bracket",0).legsToWin).toBe(2); });
  it("valide selon la cible et refuse un match inachevé", () => { expect(validateFinalLegs(5,4,5)).toEqual({legsA:5,legsB:4}); expect(() => validateFinalLegs(2,0,5)).toThrow(); expect(() => validateFinalLegs(5,5,5)).toThrow(); });
  it("valide les manches provisoires selon la cible", () => { expect(validateLiveLegs(4,4,5)).toEqual({live_legs_a:4,live_legs_b:4}); expect(() => validateLiveLegs(6,0,5)).toThrow(); });
  it("refuse les réglages impossibles", () => { expect(() => validateRoundSettings({...settings.game_settings,phases:{pool:rule(0)}})).toThrow(); expect(() => validateRoundSettings({...settings.game_settings,phases:{pool:rule(2,701)}})).toThrow(); });
});