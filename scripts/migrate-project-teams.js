"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var firebase_admin_1 = require("firebase-admin");
var commander_1 = require("commander");
// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
    if (firebase_admin_1.default.apps.length) {
        return;
    }
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
            var serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            firebase_admin_1.default.initializeApp({ credential: firebase_admin_1.default.credential.cert(serviceAccount) });
            console.log('Initialized Firebase Admin from environment variable.');
            return;
        }
        catch (e) {
            console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY.', e);
        }
    }
    try {
        var serviceAccount = require('../src/lib/serviceAccountKey.json');
        firebase_admin_1.default.initializeApp({ credential: firebase_admin_1.default.credential.cert(serviceAccount) });
        console.log('Initialized Firebase Admin from local service account key.');
    }
    catch (e) {
        console.error('Firebase Admin SDK initialization failed. Ensure service account key is available.');
        process.exit(1);
    }
}
var db = firebase_admin_1.default.firestore();
/**
 * A migration script to normalize the `team` field in all project documents.
 * It processes every team member to ensure they conform to the new `NormalizedMember` schema,
 * which includes `userId`, `role`, `createdAt`, and `updatedAt`.
 * This script correctly handles the old schema where user data was nested in a `user` field.
 */
function migrateProjectTeams(dryRun) {
    return __awaiter(this, void 0, void 0, function () {
        var projectsRef, snapshot, projectsToMigrate, batch, _loop_1, _i, _a, doc, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log("".concat(dryRun ? '[DRY RUN] ' : '', "Starting migration of project teams..."));
                    projectsRef = db.collection('projects');
                    return [4 /*yield*/, projectsRef.get()];
                case 1:
                    snapshot = _b.sent();
                    if (snapshot.empty) {
                        console.log('No projects found. Migration not needed.');
                        return [2 /*return*/];
                    }
                    projectsToMigrate = 0;
                    batch = db.batch();
                    _loop_1 = function (doc) {
                        var project = doc.data();
                        var projectId = doc.id;
                        if (!project.team || !Array.isArray(project.team)) {
                            console.log("- Project \"".concat(project.name, "\" (").concat(projectId, ") has no valid team array. Skipping."));
                            return "continue";
                        }
                        console.log("- Processing project \"".concat(project.name, "\" (").concat(projectId, ")..."));
                        var migratedTeam = project.team.map(function (member) {
                            var _a;
                            var now = new Date().toISOString();
                            // Determine the correct user ID.
                            // If a nested `user` object exists, the ID is inside it.
                            var userId = ((_a = member.user) === null || _a === void 0 ? void 0 : _a.id) || member.userId;
                            if (!userId) {
                                console.warn("  - WARNING: Skipping a team member in project ".concat(projectId, " due to missing user ID."));
                                // Return a structure that can be filtered out later if needed, though ideally this case doesn't happen.
                                return null;
                            }
                            return {
                                userId: userId,
                                role: member.role || 'participant', // Default to 'participant' if role is missing
                                createdAt: member.createdAt || now, // Preserve existing createdAt or set new
                                updatedAt: now // Always set/update the updatedAt timestamp
                            };
                        }).filter(function (m) { return m !== null; }); // Filter out any members that failed validation
                        var projectRef = projectsRef.doc(projectId);
                        if (!dryRun) {
                            batch.update(projectRef, { team: migratedTeam });
                        }
                        projectsToMigrate++;
                    };
                    for (_i = 0, _a = snapshot.docs; _i < _a.length; _i++) {
                        doc = _a[_i];
                        _loop_1(doc);
                    }
                    if (!(projectsToMigrate > 0)) return [3 /*break*/, 8];
                    if (!!dryRun) return [3 /*break*/, 6];
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, batch.commit()];
                case 3:
                    _b.sent();
                    console.log("\nSuccessfully committed batch update. Migrated ".concat(projectsToMigrate, " projects."));
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _b.sent();
                    console.error('Error committing batch update:', error_1);
                    return [3 /*break*/, 5];
                case 5: return [3 /*break*/, 7];
                case 6:
                    console.log("\n[DRY RUN] Would have migrated team data for ".concat(projectsToMigrate, " projects."));
                    _b.label = 7;
                case 7: return [3 /*break*/, 9];
                case 8:
                    console.log('\nNo projects found to migrate.');
                    _b.label = 9;
                case 9: return [2 /*return*/];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var program, options, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    program = new commander_1.Command();
                    program
                        .version('1.0.0')
                        .description('A script to migrate project team data to a normalized format.')
                        .option('--dry-run', 'Simulate the migration without writing to the database', false)
                        .parse(process.argv);
                    options = program.opts();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    initializeFirebaseAdmin();
                    return [4 /*yield*/, migrateProjectTeams(options.dryRun)];
                case 2:
                    _a.sent();
                    console.log('\nMigration script finished.');
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _a.sent();
                    console.error('An unexpected error occurred:', error_2);
                    process.exit(1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
main();
