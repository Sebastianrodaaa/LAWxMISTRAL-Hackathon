import type { Assumptions } from "./types";

export type ModelResult = {
  participants: number;
  perPerson: number;
  uncapped: number;
  gross: number;
  capped: boolean;
  afterCounsel: number;
  fundTake: number;
  expected: number;
  moic: number;
  irr: number;
};

export function runModel(input: Assumptions): ModelResult {
  const participants = input.classSize * input.participation;
  const perPerson = input.primaryHarm + input.secondaryShare * input.secondaryHarm;
  const uncapped = participants * perPerson;
  const gross = Math.min(Math.max(input.defendantCapacity, 0), Math.max(uncapped, 0));
  const afterCounsel = gross * (1 - clamp(input.counselFee, 0, 0.8));
  const fundTake = afterCounsel * clamp(input.fundShare, 0, 0.8);
  const expected = fundTake * clamp(input.certProbability, 0, 1);
  const moic = input.fundingAsk > 0 ? expected / input.fundingAsk : 0;
  const irr =
    moic > 0 && input.years > 0 ? Math.pow(moic, 1 / input.years) - 1 : 0;

  return {
    participants,
    perPerson,
    uncapped,
    gross,
    capped: uncapped > input.defendantCapacity,
    afterCounsel,
    fundTake,
    expected,
    moic,
    irr,
  };
}

export function band(input: Assumptions) {
  const low = runModel({
    ...input,
    participation: Math.max(0.05, input.participation * 0.65),
    certProbability: Math.max(0.05, input.certProbability - 0.12),
  });
  const base = runModel(input);
  const high = runModel({
    ...input,
    participation: Math.min(0.95, input.participation * 1.25),
    certProbability: Math.min(0.9, input.certProbability + 0.1),
  });
  return { low, base, high };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
