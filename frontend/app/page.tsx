"use client";

import { useState, useEffect } from "react";

// Force dynamic rendering (client-side only, no static generation)
export const dynamic = "force-dynamic";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
console.log("API_URL", API_URL);
interface User {
  id: string;
  phone: string;
}

interface Asset {
  id: string;
  type: string;
  mimeType: string;
  status: string;
  originalSizeBytes: number | null;
  createdAt: string;
  originalSignedUrl: string;
  variants: Array<{
    kind: string;
    url: string;
    width: number | null;
    height: number | null;
    format: string;
  }>;
}

interface Studio {
  id: string;
  name: string;
  area: string | null;
  specialties: string[];
}

interface Artist {
  id: string;
  name: string;
  styles: string[];
}

// Modal Component
const Modal = ({ 
  title, 
  onClose, 
  children 
}: { 
  title: string; 
  onClose: () => void; 
  children: React.ReactNode 
}) => (
  <div 
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" 
    onClick={onClose}
  >
    <div 
      className="w-full max-w-md rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-soft" 
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-xl text-[rgb(var(--ink))]">{title}</h3>
        <button 
          onClick={onClose} 
          className="text-[rgb(var(--muted))] hover:text-[rgb(var(--ink))]"
        >
          ✕
        </button>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  </div>
);

export default function HomePage() {
  const [token, setToken] = useState<string | null>(null);
  const [view, setView] = useState<"login" | "dashboard">("login");
  
  // Login state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Dashboard state
  const [user, setUser] = useState<User | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [studio, setStudio] = useState<Studio | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showEditStudio, setShowEditStudio] = useState(false);
  const [showAddArtist, setShowAddArtist] = useState(false);
  const [showUploadAsset, setShowUploadAsset] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [deleteAssetId, setDeleteAssetId] = useState<string | null>(null);

  // Form states
  const [studioForm, setStudioForm] = useState({ name: "", area: "", specialties: "" });
  const [artistForm, setArtistForm] = useState({ name: "", styles: "" });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Check for existing token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
      setView("dashboard");
    }
  }, []);

  // Fetch dashboard data when token changes
  useEffect(() => {
    if (token && view === "dashboard") {
      fetchDashboardData();
    }
  }, [token, view]);

  const fetchDashboardData = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      // Fetch all data in parallel
      const [userRes, studioRes, artistsRes, assetsRes] = await Promise.all([
        fetch(`${API_URL}/auth/me`, { headers }),
        fetch(`${API_URL}/studio`, { headers }),
        fetch(`${API_URL}/artists`, { headers }),
        fetch(`${API_URL}/assets`, { headers }),
      ]);

      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData);
      }

      if (studioRes.ok) {
        const studioData = await studioRes.json();
        setStudio(studioData.studio);
      }

      if (artistsRes.ok) {
        const artistsData = await artistsRes.json();
        setArtists(artistsData.artists);
      }

      if (assetsRes.ok) {
        const assetsData = await assetsRes.json();
        setAssets(Array.isArray(assetsData) ? assetsData : assetsData.assets || []);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!phone) {
      setLoginError("Please enter phone number");
      return;
    }

    setLoginLoading(true);
    setLoginError("");

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.message || "Login failed");
        return;
      }

      setOtpSent(true);
      if (data.otp) {
        // In development, show OTP
        alert(`Development OTP: ${data.otp}`);
      }
    } catch (error) {
      setLoginError("Network error");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!otp) {
      setLoginError("Please enter OTP");
      return;
    }

    setLoginLoading(true);
    setLoginError("");

    try {
      const res = await fetch(`${API_URL}/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.message || "Verification failed");
        return;
      }

      localStorage.setItem("token", data.token);
      setToken(data.token);
      setView("dashboard");
      setPhone("");
      setOtp("");
      setOtpSent(false);
    } catch (error) {
      setLoginError("Network error");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("token");
      setToken(null);
      setView("login");
      setUser(null);
      setAssets([]);
      setStudio(null);
      setArtists([]);
    }
  };

  const handleEditStudio = async () => {
    if (!studioForm.name.trim()) {
      setFormError("Studio name is required");
      return;
    }

    setFormLoading(true);
    setFormError("");

    try {
      const res = await fetch(`${API_URL}/studio`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: studioForm.name.trim(),
          area: studioForm.area.trim() || null,
          specialties: studioForm.specialties
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.message || "Failed to update studio");
        return;
      }

      const data = await res.json();
      setStudio(data.studio);
      setShowEditStudio(false);
      setStudioForm({ name: "", area: "", specialties: "" });
    } catch (error) {
      setFormError("Network error");
    } finally {
      setFormLoading(false);
    }
  };

  const handleAddArtist = async () => {
    if (!artistForm.name.trim()) {
      setFormError("Artist name is required");
      return;
    }

    setFormLoading(true);
    setFormError("");

    try {
      const res = await fetch(`${API_URL}/artists`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: artistForm.name.trim(),
          styles: artistForm.styles
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.message || "Failed to add artist");
        return;
      }

      const data = await res.json();
      setArtists([...artists, data.artist || data]);
      setShowAddArtist(false);
      setArtistForm({ name: "", styles: "" });
    } catch (error) {
      setFormError("Network error");
    } finally {
      setFormLoading(false);
    }
  };

  const handleUploadAsset = async () => {
    if (!uploadFile) {
      setFormError("Please select a file");
      return;
    }

    // Check for unsupported formats
    if (uploadFile.name.toLowerCase().endsWith('.heic') || uploadFile.name.toLowerCase().endsWith('.heif')) {
      setFormError("HEIC/HEIF files are not supported. Please convert to JPEG, PNG, or WebP first.");
      return;
    }

    setFormLoading(true);
    setFormError("");
    setUploadProgress("Initializing upload...");

    try {
      // Step 1: Init upload
      const initRes = await fetch(`${API_URL}/assets/init-upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: uploadFile.type.startsWith("video") ? "VIDEO" : "IMAGE",
          mimeType: uploadFile.type,
          fileName: uploadFile.name,
          sizeBytes: uploadFile.size,
        }),
      });

      if (!initRes.ok) {
        const data = await initRes.json();
        setFormError(data.message || "Failed to initialize upload");
        return;
      }

      const { assetId, uploadUrl } = await initRes.json();

      // Step 2: Upload to S3
      setUploadProgress("Uploading to storage...");
      const s3Res = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": uploadFile.type,
        },
        body: uploadFile,
      });

      if (!s3Res.ok) {
        setFormError("Failed to upload file to storage");
        return;
      }

      // Step 3: Complete upload
      setUploadProgress("Finalizing...");
      const completeRes = await fetch(`${API_URL}/assets/complete-upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ assetId }),
      });

      if (!completeRes.ok) {
        const data = await completeRes.json();
        setFormError(data.message || "Failed to complete upload");
        return;
      }

      setUploadProgress("Upload successful!");
      setTimeout(() => {
        setShowUploadAsset(false);
        setUploadFile(null);
        setUploadProgress("");
        fetchDashboardData(); // Refresh assets list
      }, 1000);
    } catch (error) {
      setFormError("Network error");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    setFormLoading(true);
    setFormError("");

    try {
      const res = await fetch(`${API_URL}/assets/${assetId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.message || "Failed to delete asset");
        return;
      }

      setAssets(assets.filter((a) => a.id !== assetId));
      setDeleteAssetId(null);
    } catch (error) {
      setFormError("Network error");
    } finally {
      setFormLoading(false);
    }
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return "N/A";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString();
  };

  // Login View
  if (view === "login") {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-8 shadow-soft">
            <h1 className="font-serif text-3xl font-semibold text-[rgb(var(--ink))]">
              Studio Admin
            </h1>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">
              Sign in with your phone number
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--muted))]">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+91XXXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={otpSent || loginLoading}
                  className="mt-2 w-full rounded-xl border border-[rgb(var(--border))] bg-white px-4 py-3 text-sm text-[rgb(var(--ink))] focus:border-[rgb(var(--accent))] focus:outline-none disabled:opacity-50"
                />
              </div>

              {otpSent && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--muted))]">
                    OTP
                  </label>
                  <input
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    disabled={loginLoading}
                    className="mt-2 w-full rounded-xl border border-[rgb(var(--border))] bg-white px-4 py-3 text-sm text-[rgb(var(--ink))] focus:border-[rgb(var(--accent))] focus:outline-none disabled:opacity-50"
                  />
                </div>
              )}

              {loginError && (
                <p className="text-sm text-red-600">{loginError}</p>
              )}

              {!otpSent ? (
                <button
                  onClick={handleLogin}
                  disabled={loginLoading}
                  className="w-full rounded-xl bg-[rgb(var(--accent))] px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:brightness-105 disabled:opacity-50"
                >
                  {loginLoading ? "Sending..." : "Send OTP"}
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={handleVerify}
                    disabled={loginLoading}
                    className="w-full rounded-xl bg-[rgb(var(--accent))] px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:brightness-105 disabled:opacity-50"
                  >
                    {loginLoading ? "Verifying..." : "Verify OTP"}
                  </button>
                  <button
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                    }}
                    disabled={loginLoading}
                    className="w-full rounded-xl border border-[rgb(var(--border))] bg-white px-5 py-3 text-sm font-medium text-[rgb(var(--muted))] transition hover:border-[rgb(var(--accent))] disabled:opacity-50"
                  >
                    Change Phone
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Dashboard View
  return (
    <main className="min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10">
        {/* Header */}
        <header className="flex items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--muted))]">
              Studio Admin
            </div>
            <h1 className="font-serif text-3xl font-semibold text-[rgb(var(--ink))]">
              {studio?.name || "My Studio"}
            </h1>
            {user && (
              <p className="text-sm text-[rgb(var(--muted))]">{user.phone}</p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-5 py-2 text-sm font-medium text-[rgb(var(--muted))] transition hover:border-red-400 hover:text-red-600"
          >
            Logout
          </button>
        </header>

        {loading && (
          <div className="mt-10 text-center text-[rgb(var(--muted))]">
            Loading...
          </div>
        )}

        {!loading && (
          <div className="mt-10 space-y-6">
            {/* Studio Section */}
            <section className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-xl text-[rgb(var(--ink))]">
                  Studio Profile
                </h2>
                <button
                  onClick={() => {
                    if (studio) {
                      setStudioForm({
                        name: studio.name,
                        area: studio.area || "",
                        specialties: studio.specialties.join(", "),
                      });
                    }
                    setShowEditStudio(true);
                  }}
                  className="rounded-xl border border-[rgb(var(--border))] px-4 py-2 text-sm font-medium text-[rgb(var(--muted))] transition hover:border-[rgb(var(--accent))]"
                >
                  Edit
                </button>
              </div>
              {studio && (
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--muted))]">
                      Name
                    </p>
                    <p className="mt-1 text-sm text-[rgb(var(--ink))]">
                      {studio.name}
                    </p>
                  </div>
                  {studio.area && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--muted))]">
                        Area
                      </p>
                      <p className="mt-1 text-sm text-[rgb(var(--ink))]">
                        {studio.area}
                      </p>
                    </div>
                  )}
                  {studio.specialties.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--muted))]">
                        Specialties
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {studio.specialties.map((s, i) => (
                          <span
                            key={i}
                            className="rounded-full border border-[rgb(var(--border))] bg-white px-3 py-1 text-xs text-[rgb(var(--muted))]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Artists Section */}
            <section className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-xl text-[rgb(var(--ink))]">
                  Artists ({artists.length})
                </h2>
                <button
                  onClick={() => setShowAddArtist(true)}
                  className="rounded-xl bg-[rgb(var(--accent))] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
                >
                  Add Artist
                </button>
              </div>
              {artists.length === 0 ? (
                <p className="mt-4 text-sm text-[rgb(var(--muted))]">
                  No artists yet. Click "Add Artist" to get started.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {artists.map((artist) => (
                    <div
                      key={artist.id}
                      className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4"
                    >
                      <p className="text-sm font-semibold text-[rgb(var(--ink))]">
                        {artist.name}
                      </p>
                      {artist.styles.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {artist.styles.map((style, i) => (
                            <span
                              key={i}
                              className="rounded-full border border-[rgb(var(--border))] bg-white px-2.5 py-1 text-xs text-[rgb(var(--muted))]"
                            >
                              {style}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Assets Section */}
            <section className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-xl text-[rgb(var(--ink))]">
                  Assets ({assets.length})
                </h2>
                <button
                  onClick={() => setShowUploadAsset(true)}
                  className="rounded-xl bg-[rgb(var(--accent))] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
                >
                  Upload Asset
                </button>
              </div>
              {assets.length === 0 ? (
                <p className="mt-4 text-sm text-[rgb(var(--muted))]">
                  No assets yet. Click "Upload Asset" to get started.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-[rgb(var(--ink))]">
                            {asset.type} - {asset.mimeType}
                          </p>
                          <p className="mt-1 text-xs text-[rgb(var(--muted))]">
                            {formatBytes(asset.originalSizeBytes)} · {formatDate(asset.createdAt)}
                          </p>
                          {asset.variants.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {asset.variants.map((v, i) => (
                                <span
                                  key={i}
                                  className="rounded-full border border-[rgb(var(--border))] bg-white px-2.5 py-1 text-xs text-[rgb(var(--muted))]"
                                >
                                  {v.kind} ({v.format})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                              asset.status === "READY"
                                ? "bg-green-100 text-green-700"
                                : asset.status === "PROCESSING"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : asset.status === "FAILED"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {asset.status}
                          </span>
                          <button
                            onClick={() => setPreviewAsset(asset)}
                            className="rounded-xl border border-[rgb(var(--border))] px-3 py-1 text-xs font-medium text-[rgb(var(--muted))] transition hover:border-[rgb(var(--accent))]"
                          >
                            Preview
                          </button>
                          <button
                            onClick={() => setDeleteAssetId(asset.id)}
                            className="rounded-xl border border-red-300 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Edit Studio Modal */}
      {showEditStudio && (
        <Modal title="Edit Studio" onClose={() => setShowEditStudio(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--muted))]">
                Studio Name *
              </label>
              <input
                type="text"
                value={studioForm.name}
                onChange={(e) => setStudioForm({ ...studioForm, name: e.target.value })}
                className="mt-2 w-full rounded-xl border border-[rgb(var(--border))] bg-white px-4 py-3 text-sm text-[rgb(var(--ink))] focus:border-[rgb(var(--accent))] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--muted))]">
                Area / Location
              </label>
              <input
                type="text"
                value={studioForm.area}
                onChange={(e) => setStudioForm({ ...studioForm, area: e.target.value })}
                className="mt-2 w-full rounded-xl border border-[rgb(var(--border))] bg-white px-4 py-3 text-sm text-[rgb(var(--ink))] focus:border-[rgb(var(--accent))] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--muted))]">
                Specialties (comma-separated)
              </label>
              <input
                type="text"
                placeholder="Blackwork, Fine line, Neo-trad"
                value={studioForm.specialties}
                onChange={(e) => setStudioForm({ ...studioForm, specialties: e.target.value })}
                className="mt-2 w-full rounded-xl border border-[rgb(var(--border))] bg-white px-4 py-3 text-sm text-[rgb(var(--ink))] focus:border-[rgb(var(--accent))] focus:outline-none"
              />
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <button
              onClick={handleEditStudio}
              disabled={formLoading}
              className="w-full rounded-xl bg-[rgb(var(--accent))] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
            >
              {formLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </Modal>
      )}

      {/* Add Artist Modal */}
      {showAddArtist && (
        <Modal title="Add Artist" onClose={() => setShowAddArtist(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--muted))]">
                Artist Name *
              </label>
              <input
                type="text"
                value={artistForm.name}
                onChange={(e) => setArtistForm({ ...artistForm, name: e.target.value })}
                className="mt-2 w-full rounded-xl border border-[rgb(var(--border))] bg-white px-4 py-3 text-sm text-[rgb(var(--ink))] focus:border-[rgb(var(--accent))] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--muted))]">
                Styles (comma-separated)
              </label>
              <input
                type="text"
                placeholder="Blackwork, Ornamental"
                value={artistForm.styles}
                onChange={(e) => setArtistForm({ ...artistForm, styles: e.target.value })}
                className="mt-2 w-full rounded-xl border border-[rgb(var(--border))] bg-white px-4 py-3 text-sm text-[rgb(var(--ink))] focus:border-[rgb(var(--accent))] focus:outline-none"
              />
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <button
              onClick={handleAddArtist}
              disabled={formLoading}
              className="w-full rounded-xl bg-[rgb(var(--accent))] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
            >
              {formLoading ? "Adding..." : "Add Artist"}
            </button>
          </div>
        </Modal>
      )}

      {/* Upload Asset Modal */}
      {showUploadAsset && (
        <Modal title="Upload Asset" onClose={() => setShowUploadAsset(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--muted))]">
                Select File (Image or Video)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="mt-2 w-full rounded-xl border border-[rgb(var(--border))] bg-white px-4 py-3 text-sm text-[rgb(var(--ink))] focus:border-[rgb(var(--accent))] focus:outline-none"
              />
              <p className="mt-1 text-xs text-[rgb(var(--muted))]">
                Supported: JPEG, PNG, WebP, GIF, MP4, MOV. HEIC files not supported.
              </p>
              {uploadFile && (
                <p className="mt-2 text-xs text-[rgb(var(--muted))]">
                  {uploadFile.name} ({formatBytes(uploadFile.size)})
                </p>
              )}
            </div>
            {uploadProgress && (
              <p className="text-sm text-[rgb(var(--accent))]">{uploadProgress}</p>
            )}
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <button
              onClick={handleUploadAsset}
              disabled={formLoading || !uploadFile}
              className="w-full rounded-xl bg-[rgb(var(--accent))] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
            >
              {formLoading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </Modal>
      )}

      {/* Preview Asset Modal */}
      {previewAsset && (
        <Modal title="Asset Preview" onClose={() => setPreviewAsset(null)}>
          <div className="space-y-4">
            {previewAsset.type === "IMAGE" ? (
              <img
                src={previewAsset.variants[0]?.url || previewAsset.originalSignedUrl}
                alt="Asset preview"
                className="w-full rounded-xl"
              />
            ) : previewAsset.type === "VIDEO" ? (
              <div>
                {previewAsset.variants.find((v) => v.kind === "poster") && (
                  <img
                    src={previewAsset.variants.find((v) => v.kind === "poster")!.url}
                    alt="Video thumbnail"
                    className="w-full rounded-xl"
                  />
                )}
                <video src={previewAsset.originalSignedUrl} controls className="mt-2 w-full rounded-xl" />
              </div>
            ) : null}
            <div className="text-sm text-[rgb(var(--muted))]">
              <p><strong>Type:</strong> {previewAsset.type}</p>
              <p><strong>Size:</strong> {formatBytes(previewAsset.originalSizeBytes)}</p>
              <p><strong>Status:</strong> {previewAsset.status}</p>
              <p><strong>Variants:</strong> {previewAsset.variants.length}</p>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteAssetId && (
        <Modal title="Delete Asset" onClose={() => setDeleteAssetId(null)}>
          <div className="space-y-4">
            <p className="text-sm text-[rgb(var(--muted))]">
              Are you sure you want to delete this asset? This action cannot be undone.
            </p>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteAssetId(null)}
                disabled={formLoading}
                className="flex-1 rounded-xl border border-[rgb(var(--border))] px-5 py-3 text-sm font-medium text-[rgb(var(--muted))] transition hover:border-[rgb(var(--accent))] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteAsset(deleteAssetId)}
                disabled={formLoading}
                className="flex-1 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {formLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}
