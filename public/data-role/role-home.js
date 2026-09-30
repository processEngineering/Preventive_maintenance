import { supabaseClient } from "../src/supabase/supabase-client.js";

// --- role configuration
export const ROLE_CONFIG = {

    "ADMIN": {
        key: "admin",
        label: "ADMIN",
        header: "HOME ADMIN",
        description:
            "Solusi digital untuk monitoring dan perawatan mesin agar operasional tetap optimal dan efisien.",
        menuUrl: "../view/base-app.html?page=menu-utama"
    },

    "OPERATOR | PELAKSANA": {
        key: "pelaksana",
        label: "OPERATOR | PELAKSANA",
        header: "HOME PELAKSANA",
        description:
            "Solusi digital untuk monitoring dan perawatan mesin agar operasional tetap optimal dan efisien.",
        menuUrl: "../view/base-app.html?page=menu-utama"
    },

    "SUPERVISOR | KOORDINATOR": {
        key: "koordinator",
        label: "SUPERVISOR | KOORDINATOR",
        header: "HOME KOORDINATOR",
        description:
            "Solusi digital untuk monitoring dan perawatan mesin agar operasional tetap optimal dan efisien.",
        menuUrl: "../view/base-app.html?page=menu-utama"
    },

    "SUPERINTENDENT": {
        key: "superintendent",
        label: "SUPERINTENDENT",
        header: "HOME SUPERINTENDENT",
        description:
            "Solusi digital untuk monitoring dan perawatan mesin agar operasional tetap optimal dan efisien.",
        menuUrl: "../view/base-app.html?page=menu-utama"
    },

    "JUNIOR MANAGER PRODUKSI": {
        key: "jm-produksi",
        label: "JUNIOR MANAGER PRODUKSI",
        header: "HOME JUNIOR MANAGER PRODUKSI",
        description:
            "Solusi digital untuk monitoring dan perawatan mesin agar operasional tetap optimal dan efisien.",
        menuUrl: "../view/base-app.html?page=menu-utama"
    },

    "JUNIOR MANAGER PPC": {
        key: "jm-ppc",
        label: "JUNIOR MANAGER PPC",
        header: "HOME JUNIOR MANAGER PPC",
        description:
            "Solusi digital untuk monitoring dan perawatan mesin agar operasional tetap optimal dan efisien.",
        menuUrl: "../view/base-app.html?page=menu-utama"
    },

    "MANAGER": {
        key: "manager",
        label: "MANAGER",
        header: "HOME MANAGER",
        description:
            "Solusi digital untuk monitoring dan perawatan mesin agar operasional tetap optimal dan efisien.",
        menuUrl: "../view/base-app.html?page=menu-utama"
    }

};


// --- get role from supabase
export async function getCurrentRole(userId) {
    if (!userId) {
        console.error(
            "User ID tidak tersedia."
        );
        return null;
    }

    const {
        data: profile,
        error
    } = await supabaseClient
        .from("profiles")
        .select("jabatan")
        .eq("id", userId)
        .single();

    if (error) {
        console.error(
            "Gagal mengambil jabatan profile:",
            error
        );
        return null;
    }

    if (!profile?.jabatan) {
        console.error(
            "Jabatan pada profile tidak ditemukan."
        );
        return null;
    }

    const role =
        profile.jabatan
            .toUpperCase()
            .trim();

    console.log(
        "ROLE DARI PROFILES:",
        role
    );
    return role;
}


// --- get role configuration
export function getRoleConfig(role) {
    return ROLE_CONFIG[role] || null;
}