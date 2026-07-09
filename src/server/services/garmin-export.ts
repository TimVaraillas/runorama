/**
 * Conversion d'une séance Runorama vers le format JSON des séances Garmin Connect.
 *
 * Le format ci-dessous suit la structure attendue par l'API Garmin Connect
 * (`/workout-service/workout`) : un `workoutSegment` contenant des
 * `workoutStep` (exécutables) et des `RepeatGroupDTO` (blocs répétés).
 *
 * Références de clés utilisées par Garmin :
 *  - sportType : 1 = running
 *  - stepType  : 1=warmup, 3=interval/active, 4=recovery, 5=rest, 2=cooldown, 6=repeat
 *  - endCondition : 1=lap.button, 2=time, 3=distance
 *  - targetType : 1=no.target, 5=pace.zone, 4=heart.rate.zone, 3=cadence
 */
import type {
  Workout,
  WorkoutElement,
  WorkoutStep,
  WorkoutRepeat,
} from '../../app/core/models/workout.model';

interface GarminKey {
  workoutStepTypeId?: number;
  stepTypeKey?: string;
  conditionTypeId?: number;
  conditionTypeKey?: string;
  workoutTargetTypeId?: number;
  workoutTargetTypeKey?: string;
}

const SPORT_TYPE = { sportTypeId: 1, sportTypeKey: 'running' };

const STEP_TYPE: Record<string, GarminKey> = {
  warmup: { workoutStepTypeId: 1, stepTypeKey: 'warmup' },
  cooldown: { workoutStepTypeId: 2, stepTypeKey: 'cooldown' },
  interval: { workoutStepTypeId: 3, stepTypeKey: 'interval' },
  active: { workoutStepTypeId: 3, stepTypeKey: 'interval' },
  recovery: { workoutStepTypeId: 4, stepTypeKey: 'recovery' },
  rest: { workoutStepTypeId: 5, stepTypeKey: 'rest' },
};

const END_CONDITION: Record<string, GarminKey> = {
  lapButton: { conditionTypeId: 1, conditionTypeKey: 'lap.button' },
  time: { conditionTypeId: 2, conditionTypeKey: 'time' },
  distance: { conditionTypeId: 3, conditionTypeKey: 'distance' },
};

const TARGET_TYPE: Record<string, GarminKey> = {
  open: { workoutTargetTypeId: 1, workoutTargetTypeKey: 'no.target' },
  cadence: { workoutTargetTypeId: 3, workoutTargetTypeKey: 'cadence' },
  heartRate: { workoutTargetTypeId: 4, workoutTargetTypeKey: 'heart.rate.zone' },
  pace: { workoutTargetTypeId: 5, workoutTargetTypeKey: 'pace.zone' },
};

/** Convertit une allure sec/km en vitesse m/s attendue par Garmin. */
function secondsPerKmToMetersPerSecond(secondsPerKm: number): number {
  if (secondsPerKm <= 0) {
    return 0;
  }
  return 1000 / secondsPerKm;
}

function buildTarget(step: WorkoutStep) {
  const target = TARGET_TYPE[step.target.type] ?? TARGET_TYPE['open'];
  const base = {
    targetType: target,
    targetValueOne: null as number | null,
    targetValueTwo: null as number | null,
  };

  if (step.target.type === 'pace' && step.target.from && step.target.to) {
    // Garmin attend des vitesses (m/s). La borne "value one" = plus lent, "two" = plus rapide.
    base.targetValueOne = secondsPerKmToMetersPerSecond(step.target.from);
    base.targetValueTwo = secondsPerKmToMetersPerSecond(step.target.to);
  } else if (
    (step.target.type === 'heartRate' || step.target.type === 'cadence') &&
    step.target.from !== undefined &&
    step.target.to !== undefined
  ) {
    base.targetValueOne = step.target.from;
    base.targetValueTwo = step.target.to;
  }

  return base;
}

function buildExecutableStep(step: WorkoutStep, order: number) {
  const stepType = STEP_TYPE[step.intent] ?? STEP_TYPE['interval'];
  const endCondition = END_CONDITION[step.durationType] ?? END_CONDITION['lapButton'];

  return {
    type: 'ExecutableStepDTO',
    stepOrder: order,
    stepType,
    endCondition,
    endConditionValue: step.durationValue ?? null,
    description: step.notes ?? null,
    ...buildTarget(step),
  };
}

function buildRepeatGroup(block: WorkoutRepeat, order: number) {
  return {
    type: 'RepeatGroupDTO',
    stepOrder: order,
    stepType: { workoutStepTypeId: 6, stepTypeKey: 'repeat' },
    numberOfIterations: block.repeat,
    smartRepeat: false,
    workoutSteps: block.steps.map((s, i) => buildExecutableStep(s, order + i + 1)),
  };
}

function isRepeat(element: WorkoutElement): element is WorkoutRepeat {
  return element.kind === 'repeat';
}

/**
 * Transforme une séance en payload JSON Garmin Connect prêt à être importé.
 */
export function toGarminWorkout(workout: Workout): unknown {
  let order = 0;
  const steps = workout.elements.map((element) => {
    order += 1;
    return isRepeat(element)
      ? buildRepeatGroup(element, order)
      : buildExecutableStep(element, order);
  });

  return {
    workoutName: workout.name,
    description: workout.description ?? '',
    sportType: SPORT_TYPE,
    workoutSegments: [
      {
        segmentOrder: 1,
        sportType: SPORT_TYPE,
        workoutSteps: steps,
      },
    ],
  };
}
