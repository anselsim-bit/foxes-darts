import { describe, expect, it } from "vitest";
import { countSpecialVisits, specialLeaders } from "./special-visits";

describe("volées spéciales", () => {
  it("compte un 180 pour trois triples 20", () => {
    expect(countSpecialVisits([{ side: "a", darts: ["T20", "T20", "T20"] }]).a["180"]).toBe(1);
  });
  it("compte 20, 5 et 1 simples dans les six ordres", () => {
    const orders = [["S20","S5","S1"],["S20","S1","S5"],["S5","S20","S1"],["S5","S1","S20"],["S1","S20","S5"],["S1","S5","S20"]];
    expect(countSpecialVisits(orders.map(darts => ({ side: "b", darts }))).b["26"]).toBe(6);
  });
  it("exclut les autres combinaisons de 26 et les volées incomplètes", () => {
    expect(countSpecialVisits([{ side:"a", darts:["D10","S5","S1"] },{ side:"a", darts:["S20","S5"] }]).a["26"]).toBe(0);
  });
  it("remplace les totaux : reprise et annulation sans double comptage", () => {
    const visit = [{ side:"a", darts:["T20","T20","T20"] }];
    expect(countSpecialVisits(visit)).toEqual(countSpecialVisits(visit));
    expect(countSpecialVisits([]).a["180"]).toBe(0);
  });
  it("cumule les matchs et change le leader en conservant les ex æquo", () => {
    const teams = [{id:"a",name:"Renards"},{id:"b",name:"Flèches"}];
    const match = {team_a:"a",team_b:"b",special_visits:countSpecialVisits([{side:"a",darts:["T20","T20","T20"]}])};
    expect(specialLeaders(teams,[match],"180")).toEqual({total:1,names:["Renards"]});
    const second = {...match,special_visits:countSpecialVisits([{side:"b",darts:["T20","T20","T20"]}])};
    expect(specialLeaders(teams,[match,second],"180").names).toEqual(["Renards","Flèches"]);
    expect(specialLeaders(teams,[match,second,second],"180")).toEqual({total:2,names:["Flèches"]});
  });
});