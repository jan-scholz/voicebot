function setupCollapsibleSections() {
  const sectionHeaders = document.querySelectorAll('.section-header')
  
  sectionHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const sectionName = header.getAttribute('data-section')
      const section = header.parentElement
      const content = section.querySelector('.section-content')
      
      // Toggle expanded state
      section.classList.toggle('expanded')
      content.classList.toggle('expanded')
      
      console.log(`Section ${sectionName} toggled`)
    })
  })
}

export { setupCollapsibleSections }
