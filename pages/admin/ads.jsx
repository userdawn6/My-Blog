import { useState, useEffect } from 'react';
import { supabase } from "../../lib/supabase";
import Link from 'next/link';
import styles from "./styles/style.module.css";
import { useRouter } from "next/router";

export default function AdsManager() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    image_url: '',
    link_url: '',
    position: 'between_posts',
    is_active: true
  });

  const [ads, setAds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isNavOpen, setIsNavOpen] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentAd, setCurrentAd] = useState(null);

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAds(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleNav = () => setIsNavOpen(!isNavOpen);
  const closeNav = () => setIsNavOpen(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isNavOpen && !event.target.closest(`.${styles.nav}`) &&
        !event.target.closest(`.${styles.navToggle}`)) {
        closeNav();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isNavOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    try {
      setIsImageUploading(true);
      let { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase
        .storage
        .from('blog-images')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      setFormData(prev => ({
        ...prev,
        image_url: publicUrl
      }));

      setSuccess("Image uploaded successfully!");
    } catch (error) {
      console.error("Image upload error:", error.message);
      setError("Image upload failed.");
    } finally {
      setIsImageUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!formData.title || !formData.content || !formData.link_url) {
        throw new Error('Title, content, and link URL are required');
      }

      if (currentAd) {
        await supabase.from('ads').update(formData).eq('id', currentAd.id);
        setSuccess('Ad updated successfully!');
      } else {
        const { data, error } = await supabase.from('ads').insert([formData]).select();
        if (error) throw error;
        setAds([data[0], ...ads]);
        setSuccess('Ad created successfully!');
      }

      setFormData({
        title: '',
        content: '',
        image_url: '',
        link_url: '',
        position: 'between_posts',
        is_active: true
      });

      setCurrentAd(null);
      setIsEditModalOpen(false);
      fetchAds();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAdStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('ads')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchAds();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteAd = async (id) => {
    if (!confirm('Are you sure you want to delete this ad?')) return;

    try {
      const { error } = await supabase
        .from('ads')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAds(ads.filter(ad => ad.id !== id));
      setSuccess('Ad deleted successfully');
    } catch (err) {
      setError(err.message);
    }
  };

  const openEditModal = (ad) => {
    setCurrentAd(ad);
    setFormData(ad);
    setIsEditModalOpen(true);
  };

  return (
    <div className={styles.adminContainer}>
      <div className={styles.adminWrapper}>
        <header className={styles.adminHeader}>
          <div className={styles.headerLeft}>
            <span className={styles.headerTitleLarge}>The Balance Code Alliance</span>
            <span className={styles.headerSubtitleSmall}>Restoring Order. Unlocking Peace. Empowering Lives</span>
          </div>

          <button className={styles.navToggle} onClick={toggleNav}>
            {isNavOpen ? '✕' : '☰'}
          </button>

          {isNavOpen && (
            <>
              <nav className={`${styles.nav} ${isNavOpen ? styles.open : ''}`}>
                <Link href="/" onClick={closeNav} className={styles.navLink}>Home</Link>
                <Link href="/about" onClick={closeNav} className={styles.navLink}>About</Link>
                <Link href="/contact" onClick={closeNav} className={styles.navLink}>Contact</Link>
                <Link href="/Gallery" onClick={closeNav} className={styles.navLink}>Gallery</Link>
              </nav>
              <div className={`${styles.navOverlay} ${isNavOpen ? styles.open : ''}`} onClick={closeNav} />
            </>
          )}
        </header>

        <main className={styles.adminMain}>
          <h1>Ads Management</h1>

          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}

          <div className={styles.adminGrid}>
            <div className={styles.adminForm}>
              <h2>Create New Ad</h2>
              <form onSubmit={handleSubmit}>
                <label>
                  Title:
                  <input type="text" name="title" value={formData.title} onChange={handleChange} required />
                </label>

                <label>
                  Content:
                  <textarea name="content" value={formData.content} onChange={handleChange}  />
                </label>

                <div className={styles.fileUploadWrapper}>
                  <label className={styles.fileUploadLabel}>
                    {formData.image_url ? 'Change Image' : 'Select Image'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className={styles.fileInput}
                    />
                  </label>

                  {formData.image_url && (
                    <div className={styles.imagePreview}>
                      <img src={formData.image_url} alt="Preview" />
                    </div>
                  )}
                </div>

                <label>
                  Link URL:
                  <input type="url" name="link_url" value={formData.link_url} onChange={handleChange}  />
                </label>

                <label>
                  Position:
                  <select name="position" value={formData.position} onChange={handleChange}>
                    <option value="between_posts">Between Posts</option>
                  </select>
                </label>

                <button type="submit" disabled={isLoading || isImageUploading} className={styles.submitButton}>
                  {isImageUploading ? 'Uploading image...' : isLoading ? 'Saving...' : currentAd ? 'Update Ad' : 'Create Ad'}
                </button>

                <button className={styles.submitButton}>
                  <Link href="/admin/dashboard" className={styles.backToAdmin}>
                    ← Back to Admin Dashboard
                  </Link>
                </button>
              </form>
            </div>

            <div className={styles.adminList}>
              <h2>Existing Ads ({ads.length})</h2>

              {isLoading && !ads.length ? (
                <p>Loading ads...</p>
              ) : ads.length === 0 ? (
                <p>No ads created yet</p>
              ) : (
                <div className={styles.adsTable}>
                  <div className={styles.tableHeader}>
                    <span>Title</span>
                    <span>Position</span>
                    <span>Actions</span>
                  </div>

                  {ads.map(ad => (
                    <div key={ad.id} className={styles.tableRow}>
                      <span>{ad.title}</span>
                      <span>{ad.position.replace('_', ' ')}</span>
                      <span>
                        <button onClick={() => openEditModal(ad)} className={styles.editButton}>
                          Edit
                        </button>
                        <button onClick={() => deleteAd(ad.id)} className={styles.deleteButton}>
                          Delete
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>

        <footer className={styles.adminFooter}>
        © {new Date().getFullYear()} Onyxe Nnaemeka's Blog. All rights reserved.
        </footer>
      </div>

      {isEditModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Edit Ad</h2>
            <form onSubmit={handleSubmit}>
              <label>
                Title:
                <input type="text" name="title" value={formData.title} onChange={handleChange} required />
              </label>

              <label>
                Content:
                <textarea name="content" value={formData.content} onChange={handleChange}  />
              </label>

              <label>
                Link URL:
                <input type="url" name="link_url" value={formData.link_url} onChange={handleChange}  />
              </label>

              <div className={styles.fileUploadWrapper}>
                <label className={styles.fileUploadLabel}>
                  {formData.image_url ? 'Change Image' : 'Upload Image'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className={styles.fileInput}
                  />
                </label>

                {formData.image_url && (
                  <div className={styles.imagePreview}>
                    <img src={formData.image_url} alt="Ad Image" />
                  </div>
                )}
              </div>

              <button type="submit" disabled={isLoading || isImageUploading} className={styles.submitButton}>
                {isImageUploading ? 'Uploading image...' : isLoading ? 'Saving...' : 'Update Ad'}
              </button>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className={styles.deleteButton}>
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
