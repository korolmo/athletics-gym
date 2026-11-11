import { describe, expect, it } from "vitest";
import { CLUB_ID } from "./club";
import { clubForHost, clubSiteUrl, isClubId, knownClubIds, normalizeHost, parseClubHosts, primaryHost, readClubHosts } from "./hosts";

const LAB = parseClubHosts("athletics-gym-lab.vercel.app=club, iron-club-lab.vercel.app=iron\niron.example.kz = iron");
const prod = { production: true };
const lab = { production: false };

describe("normalizeHost", () => {
  it("убирает порт, точку в конце и регистр", () => {
    expect(normalizeHost("Iron-Club-Lab.Vercel.App:443")).toBe("iron-club-lab.vercel.app");
    expect(normalizeHost("localhost:3000")).toBe("localhost");
    expect(normalizeHost("athleticsgym.kz.")).toBe("athleticsgym.kz");
  });
  it("неправильный адрес — null", () => {
    for (const bad of [null, undefined, "", "a b", "evil.com/path", "-x.kz", "x..kz", "ex_ample.kz", "a".repeat(254)]) {
      expect(normalizeHost(bad)).toBeNull();
    }
  });
});

describe("isClubId", () => {
  it("латиница, цифры и одиночный дефис", () => {
    expect(isClubId("club")).toBe(true);
    expect(isClubId("iron-2")).toBe(true);
    for (const bad of ["", "Iron", "iron--x", "-iron", "клуб", "a".repeat(41), "../x"]) expect(isClubId(bad)).toBe(false);
  });
});

describe("parseClubHosts", () => {
  it("разбирает записи через запятую и с новой строки, порядок адресов сохраняется", () => {
    expect(LAB.byHost.get("iron.example.kz")).toBe("iron");
    expect(LAB.byClub.get("iron")).toEqual(["iron-club-lab.vercel.app", "iron.example.kz"]);
    expect(LAB.rejected).toEqual([]);
  });
  it("пусто — пустая карта", () => {
    const empty = parseClubHosts(undefined);
    expect(empty.byHost.size).toBe(0);
    expect(empty.rejected).toEqual([]);
    expect(readClubHosts({}).byHost.size).toBe(0);
  });
  it("неправильные записи и повтор адреса откладываются, первая запись побеждает", () => {
    const h = parseClubHosts("a.kz=club,a.kz=iron,=iron,b.kz=,b.kz=Iron,c d=iron,e.kz=x--y,noequals");
    expect(h.byHost.get("a.kz")).toBe("club");
    expect([...h.byHost.keys()]).toEqual(["a.kz"]);
    expect(h.rejected).toEqual(["a.kz=iron", "=iron", "b.kz=", "b.kz=Iron", "c d=iron", "e.kz=x--y", "noequals"]);
  });
});

describe("clubForHost", () => {
  it("адрес из карты — его Клуб, с портом и в любом регистре", () => {
    expect(clubForHost("iron-club-lab.vercel.app", LAB, prod)).toBe("iron");
    expect(clubForHost("IRON.example.kz:8443", LAB, prod)).toBe("iron");
    expect(clubForHost("athletics-gym-lab.vercel.app", LAB, prod)).toBe(CLUB_ID);
  });

  it("без CLUB_HOSTS любой адрес — Клуб по умолчанию (боевой сайт не меняется)", () => {
    const none = parseClubHosts(undefined);
    for (const host of ["athleticsgym.kz", "www.athleticsgym.kz", "iron--x.vercel.app", "iron.localhost", "localhost:3000"]) {
      expect(clubForHost(host, none, prod)).toBe(CLUB_ID);
    }
    expect(clubForHost("iron.localhost", none, lab)).toBe(CLUB_ID);
  });

  it("неизвестный или неправильный адрес — Клуб по умолчанию", () => {
    expect(clubForHost("evil.com", LAB, prod)).toBe(CLUB_ID);
    expect(clubForHost("evil.com/../iron", LAB, prod)).toBe(CLUB_ID);
    expect(clubForHost(null, LAB, lab)).toBe(CLUB_ID);
  });

  it("вне production: «<id>--…» и «<id>.…» известного Клуба выбирают его", () => {
    expect(clubForHost("iron--pr-12-athletics-lab.vercel.app", LAB, lab)).toBe("iron");
    expect(clubForHost("iron.localhost:3000", LAB, lab)).toBe("iron");
    expect(clubForHost("club--pr-12-athletics-lab.vercel.app", LAB, lab)).toBe(CLUB_ID);
  });

  it("вне production неизвестный id в адресе не создаёт нового Клуба", () => {
    expect(clubForHost("ghost--pr-12.vercel.app", LAB, lab)).toBe(CLUB_ID);
    expect(clubForHost("ghost.localhost", LAB, lab)).toBe(CLUB_ID);
    // Одно имя без точки (localhost, «iron») — не поддомен
    expect(clubForHost("iron", LAB, lab)).toBe(CLUB_ID);
    expect(clubForHost("--pr-12.vercel.app", LAB, lab)).toBe(CLUB_ID);
  });

  it("на production правило превью выключено", () => {
    expect(clubForHost("iron--pr-12-athletics-lab.vercel.app", LAB, prod)).toBe(CLUB_ID);
    expect(clubForHost("iron.localhost", LAB, prod)).toBe(CLUB_ID);
  });

  it("результат — всегда известный Клуб (сегменты кэша не растут от заголовка Host)", () => {
    const known = knownClubIds(LAB);
    const hosts = ["a--b.c", "x.y.z", "iron--", "iron-.kz", "IRON--A.B", "club.localhost", "1.2.3.4", "xn--80ak6aa92e.kz"];
    for (const host of hosts) {
      expect(known.has(clubForHost(host, LAB, lab))).toBe(true);
      expect(known.has(clubForHost(host, LAB, prod))).toBe(true);
    }
  });
});

describe("primaryHost и clubSiteUrl", () => {
  it("основной адрес — первый в карте", () => {
    expect(primaryHost("iron", LAB)).toBe("iron-club-lab.vercel.app");
    expect(clubSiteUrl("iron", LAB, "https://athleticsgym.kz")).toBe("https://iron-club-lab.vercel.app");
  });
  it("у Клуба нет адресов — SITE_URL, как до П2", () => {
    const none = parseClubHosts(undefined);
    expect(primaryHost(CLUB_ID, none)).toBeNull();
    expect(clubSiteUrl(CLUB_ID, none, "https://athleticsgym.kz")).toBe("https://athleticsgym.kz");
  });
});
