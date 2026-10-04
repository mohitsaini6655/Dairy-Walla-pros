import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, BookOpen } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import type { Blog } from '../types';

export function BlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get('/blogs');
        setBlogs(data);
      } catch (err) {
        console.error('Error fetching blogs:', err);
        setError('Failed to load blogs. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 flex items-center gap-4">
          <Link to="/" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-500 hover:text-brand-600 hover:shadow-md transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">DairyWalla Blogs</h1>
            <p className="text-slate-500 mt-1">Updates, Guides, and Insights</p>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-100 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Loading blogs...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-6 rounded-2xl text-center border border-red-100">
            {error}
          </div>
        ) : blogs.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <BookOpen className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Blogs Yet</h3>
            <p className="text-slate-500">Check back soon for new updates and guides.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {blogs.map((blog) => (
              <article key={blog.id} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 hover:border-brand-200 group">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 bg-brand-50 text-brand-700 text-xs font-bold uppercase tracking-wider rounded-full border border-brand-100">
                    {blog.type}
                  </span>
                  <span className="text-sm font-medium text-slate-400">
                    {new Date(blog.createdAt).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-4 group-hover:text-brand-600 transition-colors">
                  {blog.title}
                </h2>
                <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {blog.description}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
