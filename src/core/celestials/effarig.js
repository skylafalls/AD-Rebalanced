import { BitUpgradeState } from "../game-mechanics";
import { GameDatabase } from "../secret-formula/game-database";

import { DC } from "../constants";

import { Quotes } from "./quotes";

export const EFFARIG_STAGES = {
  INFINITY: 1,
  ETERNITY: 2,
  REALITY: 3,
  COMPLETED: 4
};

export const Effarig = {
  displayName: "Effarig",
  possessiveName: "Effarig's",
  initializeRun() {
    clearCelestialRuns();
    player.celestials.effarig.run = true;
    recalculateAllGlyphs();
    Tab.reality.glyphs.show(false);
  },
  get isRunning() {
    return player.celestials.effarig.run;
  },
  get currentStage() {
    if (!EffarigUnlock.infinity.isUnlocked) {
      return EFFARIG_STAGES.INFINITY;
    }
    if (!EffarigUnlock.eternity.isUnlocked) {
      return EFFARIG_STAGES.ETERNITY;
    }
    if (!EffarigUnlock.reality.isUnlocked) {
      return EFFARIG_STAGES.REALITY;
    }
    return EFFARIG_STAGES.COMPLETED;
  },
  get currentStageName() {
    switch (this.currentStage) {
      case EFFARIG_STAGES.INFINITY:
        return "Infinity";
      case EFFARIG_STAGES.ETERNITY:
        return "Eternity";
      case EFFARIG_STAGES.REALITY:
      default:
        return "Reality";
    }
  },
  get eternityCap() {
    return this.isRunning && this.currentStage === EFFARIG_STAGES.ETERNITY ? DC.E50 : undefined;
  },
  get glyphLevelCap() {
    switch (this.currentStage) {
      case EFFARIG_STAGES.INFINITY:
        return 100;
      case EFFARIG_STAGES.ETERNITY:
        return 1500;
      case EFFARIG_STAGES.REALITY:
      default:
        return 2000;
    }
  },
  get glyphEffectAmount() {
    const genEffectBitmask = Glyphs.activeWithoutCompanion
      .filter(g => generatedTypes.includes(g.type))
      .reduce((prev, curr) => prev | curr.effects, 0);
    const nongenEffectBitmask = Glyphs.activeWithoutCompanion
      .filter(g => !generatedTypes.includes(g.type))
      .reduce((prev, curr) => prev | curr.effects, 0);
    return countValuesFromBitmask(genEffectBitmask) + countValuesFromBitmask(nongenEffectBitmask);
  },
  get shardsGained() {
    if (!TeresaUnlocks.effarig.canBeApplied) return DC.D0;
    const EffarigAlchemy = isFinite(AlchemyResource.effarig.effectValue) ? AlchemyResource.effarig.effectValue : 1;
    return Decimal.pow(Currency.eternityPoints.value.plus(1).log10() / 7500, this.glyphEffectAmount)
      .times(EffarigAlchemy);
  },
  get maxRarityBoost() {
    return 5 * Math.log10(Decimal.log10(Currency.relicShards.value.plus(10)));
  },
  nerfFactor(power) {
    let c;
    switch (this.currentStage) {
      case EFFARIG_STAGES.INFINITY:
        c = 1500;
        break;
      case EFFARIG_STAGES.ETERNITY:
        c = 29.29;
        break;
      case EFFARIG_STAGES.REALITY:
      default:
        c = 25;
        break;
    }
    return 3 * (1 - c / (c + Math.sqrt(power.pLog10())));
  },
  get tickDilation() {
    return 0.7 + 0.1 * this.nerfFactor(Currency.timeShards.value);
  },
  get multDilation() {
    return 0.25 + 0.25 * this.nerfFactor(Currency.infinityPower.value);
  },
  get tickspeed() {
    const base = 3 + Tickspeed.baseValue.reciprocal().log10();
    return Decimal.pow10(Math.pow(base, this.tickDilation)).reciprocal();
  },
  multiplier(mult) {
    const base = new Decimal(mult).pLog10();
    return Decimal.pow10(Math.pow(base, this.multDilation));
  },
  get bonusRG() {
    // Will return 0 if Effarig Infinity is uncompleted
    return Math.floor(replicantiCap().pLog10() / LOG10_MAX_VALUE - 1);
  },
  quotes: Quotes.effarig,
  symbol: "Ϙ"
};

class EffarigUnlockState extends BitUpgradeState {
  get bits() { return player.celestials.effarig.unlockBits; }
  set bits(value) { player.celestials.effarig.unlockBits = value; }

  get cost() {
    return this.config.cost;
  }

  get isEffectActive() {
    return !Pelle.isDisabled("effarig");
  }

  purchase() {
    if (this.isUnlocked || !Currency.relicShards.purchase(this.cost)) return;
    this.unlock();
    this.config.onPurchased?.();
  }
}

export function getEffarigICEffects(IC) {
  const effects = {
    IC3: Decimal.pow(1.05 + (player.galaxies * 0.005), player.totalTickBought),
    IC4: InfinityChallenge(4).effectValue,
    IC6: Currency.matter.value.clampMin(1),
    get IC6MatterGain() {
      let diffPow;
      switch (Effarig.currentStage) {
        case EFFARIG_STAGES.INFINITY:
          diffPow = 1;
          break;
        case EFFARIG_STAGES.ETERNITY:
          diffPow = 1.03;
          break;
        case EFFARIG_STAGES.REALITY:
          diffPow = 1.1;
          break;
        case EFFARIG_STAGES.COMPLETED:
          diffPow = 1.4;
          break;
      }
      return diffPow ** Math.clamp(Date.now() - player.lastUpdate, 1, 21600000);
    },
    IC7: InfinityChallenge(7).effectValue,
    get IC8() {
      const diff = player.records.thisInfinity.realTime ** 1.2 - player.records.thisInfinity.lastBuyTime;
      switch (Effarig.currentStage) {
        case EFFARIG_STAGES.INFINITY:
          return new Decimal(0.1).pow(Math.max(0, diff));
        case EFFARIG_STAGES.ETERNITY:
          return DC.C1D2_11E12.pow(Math.max(0, diff));
        case EFFARIG_STAGES.REALITY:
          return DC.C1D5_5E555.pow(Math.max(0, diff));
        case EFFARIG_STAGES.COMPLETED:
          return DC.C1D2E1111.pow(Math.max(0, diff * 1.5));
      }
      return 1;
    }
  };
  return effects[IC];
}

export const EffarigUnlock = mapGameDataToObject(
  GameDatabase.celestials.effarig.unlocks,
  config => new EffarigUnlockState(config)
);

EventHub.logic.on(GAME_EVENT.TAB_CHANGED, () => {
  if (Tab.celestials.effarig.isOpen) Effarig.quotes.initial.show();
});

EventHub.logic.on(GAME_EVENT.BIG_CRUNCH_BEFORE, () => {
  if (!Effarig.isRunning) return;
  Effarig.quotes.completeInfinity.show();
});

EventHub.logic.on(GAME_EVENT.ETERNITY_RESET_BEFORE, () => {
  if (!Effarig.isRunning) return;
  Effarig.quotes.completeEternity.show();
});
