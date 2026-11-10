import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, BookOpen, Save, Sparkles, Trash2 } from 'lucide-react'
import { PageHeader } from '../../components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { useToast } from '../../components/ui/toast/ToastProvider'
import { journalEntries } from '../../lib/mockData'
import { formatDate, todayISO } from '../../lib/format'

const journalSchema = z.object({
  title: z.string().min(3, 'Give your entry a title (at least 3 characters)'),
  mood: z.string().min(1, 'Choose a mood'),
  entry_date: z.string().min(1, 'Choose a date'),
  content: z.string().min(20, 'Write at least 20 characters so the entry is meaningful'),
})

type JournalValues = z.infer<typeof journalSchema>

const moodOptions = ['Grateful', 'Reflective', 'Calm', 'Tired', 'Energised', 'Hopeful', 'Struggling']

const prompts = [
  'What went well today, and why?',
  'Where did I feel closest to Allah today?',
  'What is one small thing I can improve tomorrow?',
  'What am I grateful for right now?',
  'What drained my energy, and what restored it?',
]

export function JournalEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const isEdit = Boolean(id)
  const existing = isEdit ? journalEntries.find((entry) => entry.id === Number(id)) : undefined
  const [prompt, setPrompt] = useState(0)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<JournalValues>({
    resolver: zodResolver(journalSchema),
    defaultValues: {
      title: '',
      mood: 'Grateful',
      entry_date: todayISO(),
      content: '',
    },
  })

  useEffect(() => {
    if (existing) {
      reset({
        title: existing.title,
        mood: existing.mood,
        entry_date: existing.entry_date,
        content: existing.content,
      })
    }
  }, [existing, reset])

  const content = watch('content') ?? ''
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0

  const onSubmit = async (values: JournalValues) => {
    await new Promise((resolve) => setTimeout(resolve, 350))
    void values
    toast.success(isEdit ? 'Journal entry updated.' : 'Journal entry saved.', 'Saved')
    navigate('/app/journal')
  }

  const onDelete = () => {
    toast.info('Journal entry removed. This cannot be undone.')
    navigate('/app/journal')
  }

  return (
    <div className="space-y-6">
      <Link
        to="/app/journal"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to journal
      </Link>

      <PageHeader
        eyebrow="Growth"
        title={isEdit ? 'Edit journal entry' : 'New journal entry'}
        description={
          existing
            ? formatDate(existing.entry_date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
            : 'Take a few quiet minutes to reflect on your day.'
        }
        actions={
          isEdit ? (
            <Button variant="outline" size="sm" onClick={onDelete} className="text-red-600">
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Reflection</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Title"
                placeholder="A quiet, focused morning"
                error={errors.title?.message}
                {...register('title')}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select label="Mood" error={errors.mood?.message} {...register('mood')}>
                  {moodOptions.map((mood) => (
                    <option key={mood} value={mood}>
                      {mood}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Date"
                  type="date"
                  error={errors.entry_date?.message}
                  {...register('entry_date')}
                />
              </div>
              <Textarea
                label="Entry"
                placeholder="Write freely…"
                className="min-h-56"
                error={errors.content?.message}
                {...register('content')}
              />
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{wordCount} words</span>
                <span>{content.length} characters</span>
              </div>
              <div className="flex justify-end">
                <Button type="submit" isLoading={isSubmitting}>
                  <Save className="h-4 w-4" />
                  {isEdit ? 'Update entry' : 'Save entry'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Writing prompt</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPrompt((value) => (value + 1) % prompts.length)}
                aria-label="Next prompt"
              >
                <Sparkles className="h-4 w-4 text-brand-600" />
              </Button>
            </CardHeader>
            <CardContent>
              <p className="rounded-xl bg-brand-50 p-4 text-sm leading-relaxed text-brand-800">
                {prompts[prompt]}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">A note on journaling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p className="flex gap-2">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                There is no perfect entry. Honesty is more useful than polish.
              </p>
              <p>Your entries are private unless you choose to share them with your group.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
