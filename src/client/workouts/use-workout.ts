"use client";

import { useLiveQuery } from "dexie-react-hooks";
import type { ExerciseItem } from "@/lib/exercise";
import type { PreviousRecord } from "@/server/workouts/offline-data";
import {
  localDb,
  type LocalSet,
  type LocalWorkout,
  type LocalWorkoutExercise,
} from "./local-db";

export type WorkoutExerciseView = {
  item: LocalWorkoutExercise;
  /** 端末に種目がなければ undefined（種目のデータを取る前など） */
  exercise: ExerciseItem | undefined;
  previous: PreviousRecord | undefined;
  sets: LocalSet[];
};

export type WorkoutView = {
  workout: LocalWorkout;
  exercises: WorkoutExerciseView[];
};

const bySortOrder = <T extends { sortOrder: number; id: string }>(a: T, b: T) =>
  a.sortOrder - b.sortOrder || a.id.localeCompare(b.id);

/** 端末にあるワークアウトを、種目・セットごと読む */
export async function loadWorkout(id: string): Promise<WorkoutView | null> {
  const workout = await localDb.workouts.get(id);
  if (!workout) return null;
  const items = (
    await localDb.workoutExercises.where("workoutId").equals(id).toArray()
  ).sort(bySortOrder);
  const exerciseIds = items.map((item) => item.exerciseId);
  const [exercises, previous, sets] = await Promise.all([
    localDb.exercises.bulkGet(exerciseIds),
    localDb.previousRecords.bulkGet(exerciseIds),
    localDb.sets
      .where("workoutExerciseId")
      .anyOf(items.map((item) => item.id))
      .toArray(),
  ]);
  return {
    workout,
    exercises: items.map((item, index) => ({
      item,
      exercise: exercises[index],
      previous: previous[index],
      sets: sets
        .filter((set) => set.workoutExerciseId === item.id)
        .sort(bySortOrder),
    })),
  };
}

/**
 * 端末のワークアウトを読み、変わるたびに読み直す。
 * 読み込み中は undefined、端末にないときは null。
 */
export function useWorkout(id: string): WorkoutView | null | undefined {
  return useLiveQuery(() => loadWorkout(id), [id]);
}
