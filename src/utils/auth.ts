import { defineStore } from "pinia";
import { ref,type Ref} from "vue";

export const UseAuth = defineStore("auth", () => {
    const code: Ref<string> = ref("qwertyuiop");
    const isallow = ref(false);
    let timer: number | null = null; // Variable to store the timer reference

    const compare = (password: any) => {
        if (password == code.value) {
            isallow.value = true; // Set isallow to true when password is correct
            // Clear existing timer if there is one
            if (timer) {
                clearTimeout(timer);
            }
            // Set a new timer
            timer = setTimeout(() => {
                isallow.value = false; // Set isallow to false after 30 days
            }, 2592000000); // 2592000000 milliseconds = 30 days
        } else {
            isallow.value = false;
        }
    };

    return { compare ,isallow};
});