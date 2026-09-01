import { supabaseClient } from "../../src/supabase/supabase-client.js";

// --- role configuration
export const ROLE_CONFIG = {

    "ADMIN": {
        key: "admin",
        label: "ADMIN",
        header: "HOME ADMIN",
        description:
            "Solusi digital untuk monitoring dan perawatan mesin agar operasional tetap optimal dan efisien.",
        menuUrl: "../menu-utama/MENU_UTAMA_ADMIN.html"
    },

    "OPERATOR | PELAKSANA": {
        key: "pelaksana",
        label: "OPERATOR | PELAKSANA",
        header: "HOME PELAKSANA",
        description:
            "Solusi digital untuk monitoring dan perawatan mesin agar operasional tetap optimal dan efisien.",
        menuUrl: "../menu-utama/MENU_UTAMA_PELAKSANA.html"
    },

    "SUPERVISOR | KOORDINATOR": {
        key: "koordinator",
        label: "SUPERVISOR | KOORDINATOR",
        header: "HOME KOORDINATOR",
        description:
            "Solusi digital untuk monitoring dan perawatan mesin agar operasional tetap optimal dan efisien.",
        menuUrl: "../menu-utama/MENU_UTAMA_KOORDINATOR.html"
    },

    "SUPERINTENDENT": {
        key: "superintendent",
        label: "SUPERINTENDENT",
        header: "HOME SUPERINTENDENT",
        description:
            "Solusi digital untuk monitoring dan perawatan mesin agar operasional tetap optimal dan efisien.",
        menuUrl: "../menu-utama/MENU_UTAMA_SUPERINTENDENT.html"
    },

    "JUNIOR MANAGER PRODUKSI": {
        key: "jm-produksi",
        label: "JUNIOR MANAGER PRODUKSI",
        header: "HOME JUNIOR MANAGER PRODUKSI",
        description:
            "Solusi digital untuk monitoring dan perawatan mesin agar operasional tetap optimal dan efisien.",
        menuUrl: "../menu-utama/MENU_UTAMA_JM_PRODUKSI.html"
    },

    "JUNIOR MANAGER PPC": {
        key: "jm-ppc",
        label: "JUNIOR MANAGER PPC",
        header: "HOME JUNIOR MANAGER PPC",
        description:
            "Solusi digital untuk monitoring dan perawatan mesin agar operasional tetap optimal dan efisien.",
        menuUrl: "../menu-utama/MENU_UTAMA_JM_PPC.html"
    },

    "MANAGER": {
        key: "manager",
        label: "MANAGER",
        header: "HOME MANAGER",
        description:
            "Solusi digital untuk monitoring dan perawatan mesin agar operasional tetap optimal dan efisien.",
        menuUrl: "../menu-utama/MENU_UTAMA_MANAGER.html"
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