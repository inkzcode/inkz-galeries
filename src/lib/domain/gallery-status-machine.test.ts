import { describe, expect, it } from "vitest";
import {
  onDelivered,
  onFinalFilesImported,
  onFirstPhotoImported,
  onPaymentRequired,
  onPostProductionStarted,
  onReadyForRetouch,
  onSelectionConfirmed,
} from "./gallery-status-machine";

describe("gallery-status-machine", () => {
  it("onFirstPhotoImported ne fait avancer que DRAFT", () => {
    expect(onFirstPhotoImported("DRAFT")).toBe("AWAITING_SELECTION");
    expect(onFirstPhotoImported("SELECTION_RECEIVED")).toBe("SELECTION_RECEIVED");
  });

  it("onSelectionConfirmed ne fait avancer que AWAITING_SELECTION", () => {
    expect(onSelectionConfirmed("AWAITING_SELECTION")).toBe("SELECTION_RECEIVED");
    expect(onSelectionConfirmed("DRAFT")).toBe("DRAFT");
  });

  it("onPaymentRequired ne fait avancer que SELECTION_RECEIVED", () => {
    expect(onPaymentRequired("SELECTION_RECEIVED")).toBe("PAYMENT_PENDING");
    expect(onPaymentRequired("PAYMENT_PENDING")).toBe("PAYMENT_PENDING");
  });

  it("onReadyForRetouch accepte SELECTION_RECEIVED (gratuit) ou PAYMENT_PENDING (payé)", () => {
    expect(onReadyForRetouch("SELECTION_RECEIVED")).toBe("TO_RETOUCH");
    expect(onReadyForRetouch("PAYMENT_PENDING")).toBe("TO_RETOUCH");
    expect(onReadyForRetouch("DRAFT")).toBe("DRAFT");
  });

  it("suit le reste du cycle de vie dans l'ordre", () => {
    expect(onPostProductionStarted("TO_RETOUCH")).toBe("IN_POST_PRODUCTION");
    expect(onFinalFilesImported("IN_POST_PRODUCTION")).toBe("READY_TO_DELIVER");
    expect(onDelivered("READY_TO_DELIVER")).toBe("DELIVERED");
  });

  it("ne rétrograde jamais un statut déjà avancé", () => {
    expect(onFirstPhotoImported("DELIVERED")).toBe("DELIVERED");
    expect(onSelectionConfirmed("ARCHIVED")).toBe("ARCHIVED");
  });
});
