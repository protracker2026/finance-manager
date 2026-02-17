import { Utils } from './utils.js';

class AuthService {
    constructor() {
        this.auth = null;
        this.currentUser = null;
    }

    async init() {
        if (typeof firebase === 'undefined') {
            console.error('Firebase SDK not loaded');
            return;
        }

        this.auth = firebase.auth();

        // Return a promise that resolves when we have the initial auth state
        return new Promise((resolve) => {
            const unsubscribe = this.auth.onAuthStateChanged(user => {
                this.currentUser = user;
                unsubscribe(); // Only need this once for init
                resolve(user);
            });
        });
    }

    getCurrentUser() {
        return this.auth ? this.auth.currentUser : null;
    }

    onAuthChange(callback) {
        if (!this.auth) return;
        return this.auth.onAuthStateChanged(user => {
            this.currentUser = user;
            callback(user);
        });
    }

    async login(email, password) {
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error("Login Check:", error); // Debug log
            return {
                success: false,
                error: this.mapAuthError(error.code)
            };
        }
    }

    async register(email, password) {
        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            return {
                success: false,
                error: this.mapAuthError(error.code)
            };
        }
    }

    async logout() {
        try {
            await this.auth.signOut();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async resetPassword(email) {
        try {
            await this.auth.sendPasswordResetEmail(email);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: this.mapAuthError(error.code)
            };
        }
    }

    mapAuthError(code) {
        switch (code) {
            case 'auth/invalid-email':
                return 'รูปแบบอีเมลไม่ถูกต้อง';
            case 'auth/user-disabled':
                return 'บัญชีนี้ถูกระงับการใช้งาน';
            case 'auth/user-not-found':
                return 'ไม่พบผู้ใช้งานนี้ในระบบ';
            case 'auth/wrong-password':
                return 'รหัสผ่านไม่ถูกต้อง';
            case 'auth/email-already-in-use':
                return 'อีเมลนี้ถูกใช้งานแล้ว';
            case 'auth/weak-password':
                return 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
            case 'auth/operation-not-allowed':
                return 'การเข้าสู่ระบบแบบนี้ยังไม่เปิดใช้งาน (กรุณาเปิด Email/Password ใน Firebase Console)';
            default:
                return 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง (' + code + ')';
        }
    }
}

export const AuthModule = new AuthService();
