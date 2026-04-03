import { sb } from "./supabase.js";
import { state } from "./state.js";

const authModal = document.getElementById("authModal");
const closeAuth = document.getElementById("closeAuth");
const userAvatar = document.getElementById("userAvatar");
const userProfilesBtn = document.getElementById("userprofiles");

const authWelcomeView = document.getElementById("authWelcomeView");
const profileView = document.getElementById("profileView");

const authStep1 = document.getElementById("authStep1");
const authStep2 = document.getElementById("authStep2");
const stepDot1 = document.getElementById("stepDot1");
const stepDot2 = document.getElementById("stepDot2");

const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const avatarInput = document.getElementById("avatarInput");
const avatarPreview = document.getElementById("avatarPreview");

const toStep2Btn = document.getElementById("toStep2Btn");
const backStep1Btn = document.getElementById("backStep1Btn");
const signUpBtn = document.getElementById("signUpBtn");
const signInBtn = document.getElementById("signInBtn");
const signOutBtn = document.getElementById("signOutBtn");
const authStatus = document.getElementById("authStatus");

const profileAvatar = document.getElementById("profileAvatar");
const profileUsername = document.getElementById("profileUsername");
const profileBio = document.getElementById("profileBio");
const profileEmail = document.getElementById("profileEmail");
const profileUsernameInput = document.getElementById("profileUsernameInput");
const profileBioInput = document.getElementById("profileBioInput");
const profileAvatarInput = document.getElementById("profileAvatarInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");

let selectedAvatarFile = null;
let selectedProfileAvatarFile = null;

function openModal() {
  authModal.style.display = "flex";
}

function closeModal() {
  authModal.style.display = "none";
}

function showStep(step) {
  if (step === 1) {
    authStep1.style.display = "block";
    authStep2.style.display = "none";
    stepDot1.classList.add("active");
    stepDot2.classList.remove("active");
  } else {
    authStep1.style.display = "none";
    authStep2.style.display = "block";
    stepDot1.classList.remove("active");
    stepDot2.classList.add("active");
  }
}

function showLoggedOutView() {
  authWelcomeView.style.display = "block";
  profileView.style.display = "none";
  showStep(1);
}

function showLoggedInView() {
  authWelcomeView.style.display = "none";
  profileView.style.display = "block";
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function loadProfile(userId) {
  const { data, error } = await sb
    .from("profiles")
    .select("username, avatar_url, bio")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
}

async function renderProfile(user) {
  const profile = await loadProfile(user.id);

  const username = profile?.username || user.email?.split("@")[0] || "user";
  const avatarUrl = profile?.avatar_url || "images/icons/user-default.svg";
  const bio = profile?.bio || "よろしくお願いします";

  profileAvatar.src = avatarUrl;
  profileUsername.textContent = username;
  profileBio.textContent = bio;
  profileEmail.textContent = user.email || "";

  profileUsernameInput.value = username;
  profileBioInput.value = bio;

  userAvatar.src = avatarUrl;

  const guestText =document.querySelector("#userprofiles .nav-text");
  if (guestText) guestText.textContent =username;
}

async function updateAuthUI(session) {
  const user = session?.user ?? null;
  state.myUserId = user?.id ?? null;

  if (user) {
    authStatus.textContent = `ログイン中: ${user.email}`;
    await ensureProfile(user);
    await renderProfile(user);
  } else {
    authStatus.textContent = "未ログイン";
    userAvatar.src = "images/icons/user-default.svg";
    const guestText = document.querySelector("#userprofiles .nav-text");
    if (guestText) guestText.textContent = "ゲスト";
  }
}

async function ensureProfile(user) {
  if (!user) return;

  const { data: existing, error: selectError } = await sb
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    console.error(selectError);
    return;
  }

  if (existing) return;

  const defaultName = user.email ? user.email.split("@")[0] : "user";

  const { error: insertError } = await sb
    .from("profiles")
    .insert([
      {
        id: user.id,
        username: defaultName,
        avatar_url: null,
        bio: "よろしくお願いします"
      }
    ]);

  if (insertError) {
    console.error(insertError);
  }
}

export async function initAuth() {
  const { data, error } = await sb.auth.getSession();

  if (error) {
    console.error(error);
  }

  await updateAuthUI(data?.session ?? null);

  const hasSession = !!data?.session?.user;
  if (hasSession) {
    showLoggedInView();
  } else {
    showLoggedOutView();
  }

  sb.auth.onAuthStateChange(async (event, session) => {
    await updateAuthUI(session);
    if (session?.user) {
      showLoggedInView();
    } else {
      showLoggedOutView();
    }
  });

  userProfilesBtn.addEventListener("click", async () => {
    const { data } = await sb.auth.getSession();
    if (data?.session?.user) {
      await renderProfile(data.session.user);
      showLoggedInView();
    } else {
      showLoggedOutView();
    }
    openModal();
  });

  closeAuth.addEventListener("click", closeModal);

  authModal.addEventListener("click", (e) => {
    if (e.target === authModal) closeModal();
  });

  toStep2Btn.addEventListener("click", () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      alert("メールアドレスとパスワードを入力してください");
      return;
    }

    showStep(2);
  });

  backStep1Btn.addEventListener("click", () => {
    showStep(1);
  });

  avatarInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    selectedAvatarFile = file;
    avatarPreview.src = await fileToDataUrl(file);
    avatarPreview.style.display = "block";
  });

  profileAvatarInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    selectedProfileAvatarFile = file;
    profileAvatar.src = await fileToDataUrl(file);
  });

  signUpBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const username = usernameInput.value.trim();
    const bio = bioInput.value.trim();

    if (!email || !password || !username) {
      alert("メールアドレス、パスワード、ユーザーネームを入力してください");
      return;
    }

    const { data, error } = await sb.auth.signUp({
      email,
      password
    });

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    if (!data.user) {
      alert("登録に失敗しました");
      return;
    }

    let avatarUrl = null;
    if (selectedAvatarFile) {
      avatarUrl = await fileToDataUrl(selectedAvatarFile);
    }

    const { error: upsertError } = await sb
      .from("profiles")
      .upsert([
        {
          id: data.user.id,
          username,
          bio: bio || "よろしくお願いします",
          avatar_url: avatarUrl
        }
      ]);

    if (upsertError) {
      console.error(upsertError);
      alert("プロフィール保存に失敗しました");
      return;
    }

    const { error: signInError } = await sb.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      console.error(signInError);
      alert(signInError.message);
      return;
    }

    alert("登録してログインしました");
    closeModal();
  });

  signInBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      alert("メールアドレスとパスワードを入力してください");
      return;
    }

    const { error } = await sb.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    alert("ログインしました");
    closeModal();
  });

  saveProfileBtn.addEventListener("click", async () => {
    const { data } = await sb.auth.getSession();
    const user = data?.session?.user;
    if (!user) return;

    let avatarUrl = null;
    if (selectedProfileAvatarFile) {
      avatarUrl = await fileToDataUrl(selectedProfileAvatarFile);
    }

    const payload = {
      username: profileUsernameInput.value.trim() || "user",
      bio: profileBioInput.value.trim() || "よろしくお願いします"
    };

    if (avatarUrl) {
      payload.avatar_url = avatarUrl;
    }

    const { error } = await sb
      .from("profiles")
      .update(payload)
      .eq("id", user.id);

    if (error) {
      console.error(error);
      alert("プロフィール更新に失敗しました");
      return;
    }

    await renderProfile(user);
    alert("プロフィールを更新しました");
  });

  signOutBtn.addEventListener("click", async () => {
    const { error } = await sb.auth.signOut();

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    alert("ログアウトしました");
    closeModal();
  });
}