"use client";

/**
 * Event registration for members of the public.
 *
 * No account is required — expecting a villager to create a password to attend
 * a homam would simply mean nobody registers. Abuse is contained by rules-level
 * validation and by a deterministic document ID that makes duplicates
 * impossible rather than merely unlikely.
 */

import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { normalisePhone, registrationId } from "@/lib/domain/ids";

export interface RegistrationInput {
  eventId: string;
  name: string;
  phone: string;
  email?: string;
  gotram?: string;
  nakshatra?: string;
  participantCount: number;
  specialRequest?: string;
}

export type RegistrationOutcome =
  | { status: "REGISTERED"; reference: string }
  /**
   * The write was refused. This deliberately conflates "you already registered"
   * with "registration is closed", because distinguishing them would require
   * letting the public read registration documents — and those contain other
   * villagers' names and phone numbers. Privacy wins over precision here.
   */
  | { status: "REFUSED"; message: string }
  | { status: "INVALID"; field: string; message: string }
  | { status: "FAILED"; message: string };

export const MAX_PARTICIPANTS = 20;

export async function registerForEvent(
  input: RegistrationInput,
): Promise<RegistrationOutcome> {
  const name = input.name.trim();
  if (name.length < 2) {
    return { status: "INVALID", field: "name", message: "Please enter your full name." };
  }

  const phone = normalisePhone(input.phone);
  if (!phone) {
    return {
      status: "INVALID",
      field: "phone",
      message: "Enter a 10-digit Indian mobile number, for example 98765 43210.",
    };
  }

  if (
    !Number.isInteger(input.participantCount) ||
    input.participantCount < 1 ||
    input.participantCount > MAX_PARTICIPANTS
  ) {
    return {
      status: "INVALID",
      field: "participantCount",
      message: `Enter how many people are coming, between 1 and ${MAX_PARTICIPANTS}.`,
    };
  }

  const id = registrationId(input.eventId, phone);
  if (!id) {
    return { status: "INVALID", field: "phone", message: "That mobile number is not valid." };
  }

  const ref = doc(db(), "registrations", id);

  // Note: there is deliberately no "does this already exist?" read here.
  // Registrations are not publicly readable — they hold other people's phone
  // numbers — so such a check would always fail for an anonymous visitor and
  // tell us nothing. Duplicate suppression is enforced by the write itself:
  // the document ID is derived from the event and phone number, and the rules
  // permit `create` only, so a second submission is refused by the database.
  try {
    await setDoc(ref, {
      eventId: input.eventId,
      name,
      phone,
      email: input.email?.trim() || null,
      gotram: input.gotram?.trim() || null,
      nakshatra: input.nakshatra?.trim() || null,
      participantCount: input.participantCount,
      specialRequest: input.specialRequest?.trim() || null,
      status: "CONFIRMED",
      createdAt: serverTimestamp(),
    });
    return { status: "REGISTERED", reference: id };
  } catch (error) {
    const code = (error as { code?: string })?.code;

    // By far the most common cause is that this mobile number is already
    // registered — including the case of a double-tapped submit button, where
    // the person is in fact registered and should not be alarmed.
    if (code === "permission-denied") {
      return {
        status: "REFUSED",
        message:
          "This mobile number is already registered for this event, so there is nothing more to do. " +
          "If you have not registered before, registration for this event may have closed — please ask at the temple office.",
      };
    }

    return {
      status: "FAILED",
      message: "Could not complete registration. Check your connection and try again.",
    };
  }
}
