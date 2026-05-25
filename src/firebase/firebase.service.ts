import { Injectable } from "@nestjs/common";
import * as admin from "firebase-admin";

@Injectable()
export class FirebaseService {
  private readonly app: admin.app.App;

  constructor() {
    if (!admin.apps.length) {
      this.app = admin.initializeApp();
    } else {
      this.app = admin.app();
    }
  }

  get auth(): admin.auth.Auth {
    return this.app.auth();
  }

  get firestore(): admin.firestore.Firestore {
    return this.app.firestore();
  }
}