import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { LucideIcon } from 'lucide-react'
import {
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Download,
  File,
  FileText,
  Filter,
  Headphones,
  Library,
  Plus,
  Search,
  Upload,
  Video,
} from 'lucide-react'
import { PageHeader } from '../../components/shared/PageHeader'
import { EmptyState } from '../../components/shared/EmptyState'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toast/ToastProvider'
import { useAuth } from '../../features/auth/useAuth'
import { libraryResources } from '../../lib/mockData'
import { formatDate } from '../../lib/format'
import { libraryApi } from '../../lib/api/endpoints'
import { ApiError } from '../../lib/api/client'
import type { LibraryResource } from '../../types/domain'
import { cn } from '../../lib/utils'

function detectFileType(file: File): LibraryResource['file_type'] {
  const name = file.name.toLowerCase()
  if (file.type.startsWith('audio/') || /\.(mp3|wav|m4a|ogg)$/.test(name)) return 'audio'
  if (file.type.startsWith('video/') || /\.(mp4|mov|webm)$/.test(name)) return 'video'
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
  return 'doc'
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const fileTypeMeta: Record<
  LibraryResource['file_type'],
  { label: string; icon: LucideIcon; className: string }
> = {
  pdf: { label: 'PDF', icon: FileText, className: 'bg-rose-50 text-rose-600' },
  audio: { label: 'Audio', icon: Headphones, className: 'bg-amber-50 text-amber-600' },
  video: { label: 'Video', icon: Video, className: 'bg-violet-50 text-violet-600' },
  doc: { label: 'Document', icon: File, className: 'bg-sky-50 text-sky-600' },
}

const visibilityMeta: Record<
  LibraryResource['visibility'],
  { label: string; variant: 'success' | 'info' | 'outline' }
> = {
  public: { label: 'Public', variant: 'success' },
  assigned: { label: 'Assigned', variant: 'info' },
  private: { label: 'Private', variant: 'outline' },
}

const uploadSchema = z.object({
  title: z.string().min(3, 'Give the resource a title (at least 3 characters)'),
  description: z.string().max(300, 'Keep the description under 300 characters').optional(),
  category: z.string().min(1, 'Choose a category'),
  visibility: z.enum(['public', 'assigned', 'private']),
})

type UploadValues = z.infer<typeof uploadSchema>

const categories = [
  'Quran',
  'Worship',
  'Self development',
  'Health',
  'Fitness',
  'Planning',
  'Family',
]

const fileTypes: { value: LibraryResource['file_type'] | 'all'; label: string }[] = [
  { value: 'all', label: 'All file types' },
  { value: 'pdf', label: 'PDF' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Video' },
  { value: 'doc', label: 'Document' },
]

export function DigitalLibraryPage() {
  const { user } = useAuth()
  const toast = useToast()
  const isAdmin = user?.role === 'admin'

  const [resources, setResources] = useState<LibraryResource[]>(libraryResources)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [fileType, setFileType] = useState<LibraryResource['file_type'] | 'all'>('all')
  const [onlyBookmarked, setOnlyBookmarked] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UploadValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'Quran',
      visibility: 'public',
    },
  })

  const filtered = useMemo(
    () =>
      resources.filter((resource) => {
        const matchesSearch =
          !search ||
          resource.title.toLowerCase().includes(search.toLowerCase()) ||
          (resource.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
          resource.category.toLowerCase().includes(search.toLowerCase())
        const matchesCategory = category === 'all' || resource.category === category
        const matchesType = fileType === 'all' || resource.file_type === fileType
        const matchesBookmark = !onlyBookmarked || resource.bookmarked
        return matchesSearch && matchesCategory && matchesType && matchesBookmark
      }),
    [resources, search, category, fileType, onlyBookmarked]
  )

  const bookmarkCount = resources.filter((resource) => resource.bookmarked).length

  const toggleBookmark = (resource: LibraryResource) => {
    setResources((current) =>
      current.map((item) =>
        item.id === resource.id ? { ...item, bookmarked: !item.bookmarked } : item
      )
    )
    toast.success(
      resource.bookmarked ? `“${resource.title}” removed from bookmarks.` : `“${resource.title}” bookmarked.`
    )
  }

  const closeUpload = () => {
    setUploadOpen(false)
    setFile(null)
    setFileError(null)
    reset()
  }

  const onUpload = async (values: UploadValues) => {
    if (!file) {
      setFileError('Choose a file to upload.')
      return
    }
    setFileError(null)

    const resource: LibraryResource = {
      id: Date.now(),
      title: values.title,
      description: values.description ?? null,
      category: values.category,
      file_type: detectFileType(file),
      visibility: values.visibility,
      size: formatFileSize(file.size),
      bookmarked: false,
      created_at: new Date().toISOString(),
    }

    try {
      await libraryApi.create({
        title: values.title,
        description: values.description,
        visibility: values.visibility,
        file,
      })
      toast.success(`“${values.title}” has been added to the library.`, 'Resource uploaded')
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message, 'Could not upload resource')
        return
      }
      toast.info('Saved locally. The API is unreachable right now.', 'Offline mode')
    }

    setResources((current) => [resource, ...current])
    closeUpload()
  }

  const onDownload = (resource: LibraryResource) => {
    toast.info(`Preparing “${resource.title}” for download.`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Records"
        title="Digital library"
        description="Worksheets, audio lessons and reading material shared with your group."
        actions={
          isAdmin ? (
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4" />
              Upload resource
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <span className="rounded-xl bg-brand-50 p-2.5 text-brand-600">
              <Library className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Resources
              </p>
              <p className="text-xl font-bold text-slate-900">{resources.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <span className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
              <BookmarkCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Bookmarked
              </p>
              <p className="text-xl font-bold text-slate-900">{bookmarkCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <span className="rounded-xl bg-sky-50 p-2.5 text-sky-600">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Categories
              </p>
              <p className="text-xl font-bold text-slate-900">
                {new Set(resources.map((resource) => resource.category)).size}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search the library…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                aria-label="Search library resources"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                containerClassName="w-44"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                aria-label="Filter by category"
              >
                <option value="all">All categories</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
              <Select
                containerClassName="w-40"
                value={fileType}
                onChange={(event) =>
                  setFileType(event.target.value as LibraryResource['file_type'] | 'all')
                }
                aria-label="Filter by file type"
              >
                {fileTypes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
              <Button
                variant={onlyBookmarked ? 'default' : 'outline'}
                size="sm"
                onClick={() => setOnlyBookmarked((value) => !value)}
                aria-pressed={onlyBookmarked}
              >
                <Bookmark className="h-3.5 w-3.5" />
                Bookmarked
              </Button>
            </div>
          </div>

          <p className="inline-flex items-center gap-1 text-xs text-slate-400">
            <Filter className="h-3.5 w-3.5" />
            {filtered.length} of {resources.length} resources
          </p>

          {filtered.length === 0 ? (
            <EmptyState
              icon={Library}
              title="No resources found"
              description="Try adjusting your search or filters to find what you need."
              action={
                <Button variant="outline" size="sm" onClick={() => {
                  setSearch('')
                  setCategory('all')
                  setFileType('all')
                  setOnlyBookmarked(false)
                }}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((resource) => {
                const meta = fileTypeMeta[resource.file_type]
                const Icon = meta.icon
                const visibility = visibilityMeta[resource.visibility]
                return (
                  <article
                    key={resource.id}
                    className="group flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className={cn('rounded-xl p-2.5', meta.className)}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleBookmark(resource)}
                        aria-label={resource.bookmarked ? 'Remove bookmark' : 'Bookmark resource'}
                        aria-pressed={!!resource.bookmarked}
                        className={cn(
                          'rounded-lg p-1.5 transition-colors',
                          resource.bookmarked
                            ? 'text-amber-500 hover:bg-amber-50'
                            : 'text-slate-300 hover:bg-slate-50 hover:text-slate-500'
                        )}
                      >
                        {resource.bookmarked ? (
                          <BookmarkCheck className="h-4 w-4" />
                        ) : (
                          <Bookmark className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    <h3 className="mt-3 text-sm font-semibold text-slate-900">{resource.title}</h3>
                    <p className="mt-1 line-clamp-2 flex-1 text-xs leading-relaxed text-slate-500">
                      {resource.description ?? 'No description provided.'}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline">{resource.category}</Badge>
                      <Badge variant={visibility.variant}>{visibility.label}</Badge>
                      <span className="text-[10px] text-slate-400">{meta.label}</span>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-[11px] text-slate-400">
                        {resource.size} · {formatDate(resource.created_at)}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => onDownload(resource)}>
                        <Download className="h-3.5 w-3.5" />
                        Open
                      </Button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={uploadOpen}
        onClose={closeUpload}
        title="Upload a resource"
        description="Share a file with the whole community, a group or only yourself."
        footer={
          <>
            <Button variant="outline" onClick={closeUpload}>
              Cancel
            </Button>
            <Button type="submit" form="upload-resource-form" isLoading={isSubmitting}>
              <Upload className="h-4 w-4" />
              Upload resource
            </Button>
          </>
        }
      >
        <form id="upload-resource-form" onSubmit={handleSubmit(onUpload)} className="space-y-4">
          <Input
            label="Title"
            placeholder="A guide to consistent habits"
            error={errors.title?.message}
            {...register('title')}
          />
          <Textarea
            label="Description (optional)"
            placeholder="What is this resource about?"
            error={errors.description?.message}
            {...register('description')}
          />
          <Select label="Category" error={errors.category?.message} {...register('category')}>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Select label="Visibility" error={errors.visibility?.message} {...register('visibility')}>
            <option value="public">Public — everyone</option>
            <option value="assigned">Assigned — my groups</option>
            <option value="private">Private — only me</option>
          </Select>
          <div className="space-y-1.5">
            <label
              htmlFor="library-file"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
            >
              Attachment
            </label>
            <input
              id="library-file"
              type="file"
              accept=".pdf,.doc,.docx,.mp3,.wav,.m4a,.mp4,.mov,.webm"
              onChange={(event) => {
                const selected = event.target.files?.[0] ?? null
                if (selected && selected.size > 50 * 1024 * 1024) {
                  setFile(null)
                  setFileError('Files must be 50 MB or smaller.')
                  return
                }
                setFile(selected)
                if (selected) setFileError(null)
              }}
              className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3.5 py-3 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
            />
            {fileError ? (
              <p className="text-xs font-medium text-red-600">{fileError}</p>
            ) : file ? (
              <p className="text-xs text-slate-500">
                {file.name} · {formatFileSize(file.size)}
              </p>
            ) : (
              <p className="text-xs text-slate-400">PDF, DOC, MP3 or MP4 up to 50 MB.</p>
            )}
          </div>
        </form>
      </Modal>

      <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 text-xs text-slate-500 shadow-soft">
        <Plus className="h-4 w-4 text-brand-500" />
        Administrators can share resources with specific groups. Everyone can bookmark resources for
        quick access later.
      </div>
    </div>
  )
}
