import { FormClient } from './form-client'

interface PageProps {
  params: { slug: string }
}

export default function PublicFormPage({ params }: PageProps) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <FormClient slug={params.slug} />
    </div>
  )
}
