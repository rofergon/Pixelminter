import Image from 'next/image'

function Header() {
  return (
    <header>
      <Image src="/logo.png" alt="Logo" width={100} height={50} />
    </header>
  )
}