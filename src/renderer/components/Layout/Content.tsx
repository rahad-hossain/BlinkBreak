interface ContentProps {
  children: React.ReactNode
  isTransitioning: boolean
}

export default function Content({ children, isTransitioning }: ContentProps) {
  return (
    <div className="flex-1 h-screen overflow-y-auto bg-background">
      <div 
        className={`max-w-6xl mx-auto p-8 transition-opacity duration-200 ease-out ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {children}
      </div>
    </div>
  )
}
