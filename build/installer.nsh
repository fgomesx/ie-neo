; Idioma padrão do aplicativo escolhido na instalação.
; 1046 = Português (Brasil); qualquer outro = Inglês (Estados Unidos).
!macro customInstall
  ${if} $LANGUAGE == 1046
    StrCpy $0 "pt-BR"
  ${else}
    StrCpy $0 "en-US"
  ${endif}

  CreateDirectory "$INSTDIR\resources"
  FileOpen $1 "$INSTDIR\resources\install-language.txt" w
  FileWrite $1 $0
  FileClose $1
!macroend

!macro customUnInstall
  Delete "$INSTDIR\resources\install-language.txt"
!macroend
