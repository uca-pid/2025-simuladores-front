# Custom Hooks

Esta carpeta contiene hooks personalizados reutilizables para mejorar la escalabilidad y reducir la duplicación de código.

## 📚 Hooks Disponibles

### `useModal`

Hook para gestionar el estado y las operaciones de modales en toda la aplicación.

**Uso:**
```javascript
import { useModal } from '../hooks';

function MiComponente() {
  const { modal, showModal, closeModal, showSuccess, showError, showWarning, showConfirm } = useModal();

  const handleAction = () => {
    showSuccess('Éxito', 'La operación se completó correctamente');
  };

  return (
    <>
      <button onClick={handleAction}>Realizar Acción</button>
      <Modal
        show={modal.show}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm}
        onClose={closeModal}
        showCancel={modal.showCancel}
      />
    </>
  );
}
```

**Métodos disponibles:**
- `showModal(type, title, message, onConfirm, showCancel)` - Método genérico
- `showSuccess(title, message, onConfirm)` - Atajo para modales de éxito
- `showError(title, message, onConfirm)` - Atajo para modales de error
- `showWarning(title, message, onConfirm, showCancel)` - Atajo para advertencias
- `showConfirm(title, message, onConfirm, showCancel)` - Atajo para confirmaciones
- `showInfo(title, message, onConfirm)` - Atajo para información
- `closeModal()` - Cierra el modal actual

---

### `useSEB`

Hook para gestionar la detección y operaciones relacionadas con Safe Exam Browser (SEB).

**Uso:**
```javascript
import { useSEB } from '../hooks';

function ExamenPage() {
  const { isInSEB, closeSEB, checkSEB } = useSEB();

  const handleFinish = () => {
    if (isInSEB) {
      closeSEB(); // Redirige automáticamente
    } else {
      navigate('/home');
    }
  };

  return (
    <div>
      {isInSEB && <div className="seb-indicator">Ejecutando en SEB</div>}
      <button onClick={handleFinish}>Finalizar Examen</button>
    </div>
  );
}
```

**Propiedades disponibles:**
- `isInSEB` - Boolean que indica si la app está ejecutándose en SEB
- `closeSEB(redirectUrl?)` - Función para cerrar/redireccionar desde SEB
- `checkSEB()` - Función para verificar manualmente si está en SEB

---

## 🎯 Beneficios

### Antes (sin hooks):
```javascript
// En cada componente: ~50 líneas de código duplicado
const [modal, setModal] = useState({...});
const showModal = (type, title, message, onConfirm, showCancel) => {...};
const closeModal = () => {...};
const [isInSEB, setIsInSEB] = useState(false);
useEffect(() => { /* detectar SEB */ }, []);
const closeSEB = () => {...};
```

### Después (con hooks):
```javascript
// En cada componente: 2 líneas
const { modal, showModal, closeModal } = useModal();
const { isInSEB, closeSEB } = useSEB();
```

**Reducción**: ~90% menos código duplicado ✅

---

## 📝 Convenciones

1. **Nombres**: Todos los hooks personalizados empiezan con `use`
2. **Exportación**: Exportar como named export en el archivo del hook
3. **Re-exportación**: Incluir en `index.js` para importación centralizada
4. **Documentación**: Incluir JSDoc en cada hook

---

## 🔄 Próximos Hooks Planificados

- `useExamData` - Gestión de datos de exámenes
- `useInscriptions` - Gestión de inscripciones
- `useAttempt` - Gestión de intentos de examen
- `useFormValidation` - Validaciones de formularios
- `useWebSocket` - Conexiones WebSocket
- `useAutoSave` - Auto-guardado de datos

---

## 🤝 Contribuir

Al agregar un nuevo hook:

1. Crear archivo `useNombreHook.js`
2. Exportar el hook con JSDoc completo
3. Agregar export en `index.js`
4. Actualizar este README
5. Actualizar componentes que puedan beneficiarse
