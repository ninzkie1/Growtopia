import {create} from "zustand";
export const useThemeStore = create((set) => ({
    theme: localStorage.getItem("cat-theme") || "coffee",
    setTheme: (theme) => {
        localStorage.setItem("cat-theme", theme);
        set({theme});
    }
}));
